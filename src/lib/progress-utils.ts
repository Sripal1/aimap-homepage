import type {
  WorkflowJobWithSteps,
  WorkflowArtifact,
  StageId,
  StageStatus,
  StageProgress,
  ResearcherInfo,
  ResearcherLogStatus,
  ChunkStatus,
} from '@/types'

// ── Stage metadata ─────────────────────────────────────────────────

const STAGE_META: Record<StageId, { label: string; description: string; weight: number }> = {
  prepare:   { label: 'Setting Up',            description: 'Getting everything ready to build your map',                    weight: 0.05 },
  scrape:    { label: 'Collecting Profiles',    description: 'Gathering publication data for each researcher',               weight: 0.35 },
  combine:   { label: 'Merging Data',           description: 'Combining all researcher profiles into one dataset',           weight: 0.05 },
  summarize: { label: 'Writing Summaries',      description: 'Creating research summaries for each professor',               weight: 0.30 },
  finalize:  { label: 'Finishing Up',           description: 'Computing the map layout and downloading photos',              weight: 0.15 },
  deploy:    { label: 'Publishing',             description: 'Building your interactive map and putting it online',          weight: 0.10 },
}

const STAGE_ORDER: StageId[] = ['prepare', 'scrape', 'combine', 'summarize', 'finalize', 'deploy']

// ── CSV helpers ─────────────────────────────────────────────────────

function parseCsvRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

// ── CSV parsing ────────────────────────────────────────────────────

const RE_PLACEHOLDER_NAME = /^researcher_(.+)$/

export function parseResearchersCsv(text: string, chunkSize: number): ResearcherInfo[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headerCols = parseCsvRow(lines[0]).map((c) => c.trim().toLowerCase())
  const nameIdx = headerCols.findIndex((c) => c === 'name' || c === 'researcher' || c === 'scholar_name')
  const urlIdx = headerCols.findIndex((c) => c === 'url' || c === 'scholar_url' || c === 'google_scholar_url')

  return lines.slice(1).map((line, i) => {
    const parts = parseCsvRow(line).map((p) => p.trim())
    const url = urlIdx >= 0 ? parts[urlIdx] : undefined
    const idMatch = url?.match(/[?&]user=([A-Za-z0-9_-]+)/)
    const name = nameIdx >= 0 ? parts[nameIdx] : `Researcher ${i + 1}`
    // Detect placeholder names like "researcher_ABC123" and show just the Scholar ID
    const placeholderMatch = name.match(RE_PLACEHOLDER_NAME)
    return {
      name,
      displayName: placeholderMatch ? placeholderMatch[1] : undefined,
      scholarUrl: url,
      scholarId: idMatch ? idMatch[1] : undefined,
      chunkIndex: Math.floor(i / chunkSize),
    }
  }).filter((r) => r.name.length > 0)
}

// ── Config YAML parsing (simple regex, no deps) ────────────────────

export function parseConfigYaml(text: string): { chunkSize: number; universityName: string; departmentName: string } {
  const chunkMatch = text.match(/chunk_size\s*:\s*(\d+)/)
  const uniMatch = text.match(/university(?:_name)?\s*:\s*["']?(.+?)["']?\s*$/m)
  const deptMatch = text.match(/department(?:_name)?\s*:\s*["']?(.+?)["']?\s*$/m)

  return {
    chunkSize: chunkMatch ? parseInt(chunkMatch[1], 10) : 50,
    universityName: uniMatch ? uniMatch[1].trim() : '',
    departmentName: deptMatch ? deptMatch[1].trim() : '',
  }
}

// ── Job → Stage mapping ────────────────────────────────────────────

function jobToStageStatus(job: WorkflowJobWithSteps): StageStatus {
  if (job.status === 'completed') {
    return job.conclusion === 'success' ? 'done' : 'failed'
  }
  if (job.status === 'in_progress') return 'running'
  if (job.status === 'queued') return 'queued'
  return 'pending'
}

function stepsCompletedFraction(steps: { status: string; conclusion: string | null }[]): number {
  if (steps.length === 0) return 0
  const completed = steps.filter((s) => s.status === 'completed' && s.conclusion === 'success').length
  return completed / steps.length
}

function buildSingleJobStage(
  stageId: StageId,
  job: WorkflowJobWithSteps | undefined,
): StageProgress {
  const meta = STAGE_META[stageId]
  if (!job) {
    return {
      id: stageId,
      label: meta.label,
      description: meta.description,
      status: 'pending',
      weight: meta.weight,
      completedFraction: 0,
      steps: [],
      timing: { startedAt: null, completedAt: null, durationMs: null },
    }
  }

  const status = jobToStageStatus(job)
  const fraction = status === 'done' ? 1 : status === 'failed' ? stepsCompletedFraction(job.steps) : stepsCompletedFraction(job.steps)
  const durationMs = job.started_at && job.completed_at
    ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
    : job.started_at
      ? Date.now() - new Date(job.started_at).getTime()
      : null

  return {
    id: stageId,
    label: meta.label,
    description: meta.description,
    status,
    weight: meta.weight,
    completedFraction: fraction,
    steps: job.steps,
    timing: { startedAt: job.started_at, completedAt: job.completed_at, durationMs },
    jobUrl: job.html_url,
  }
}

function buildMatrixStage(
  stageId: StageId,
  jobs: WorkflowJobWithSteps[],
  researchers: ResearcherInfo[],
): StageProgress {
  const meta = STAGE_META[stageId]

  if (jobs.length === 0) {
    return {
      id: stageId,
      label: meta.label,
      description: meta.description,
      status: 'pending',
      weight: meta.weight,
      completedFraction: 0,
      chunks: [],
      timing: { startedAt: null, completedAt: null, durationMs: null },
    }
  }

  // Build chunk statuses
  const chunks: ChunkStatus[] = jobs.map((job) => {
    const chunkMatch = job.name.match(/chunk\s*(\d+)/i)
    const chunkIndex = chunkMatch ? parseInt(chunkMatch[1], 10) : 0
    const chunkResearchers = (stageId === 'scrape' || stageId === 'summarize')
      ? researchers.filter((r) => r.chunkIndex === chunkIndex)
      : []
    const status = jobToStageStatus(job)

    return {
      chunkIndex,
      status,
      researchers: chunkResearchers,
      jobUrl: job.html_url,
      jobId: job.id,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      steps: job.steps,
    }
  }).sort((a, b) => a.chunkIndex - b.chunkIndex)

  // Aggregate status
  const completed = chunks.filter((c) => c.status === 'done').length
  const failed = chunks.filter((c) => c.status === 'failed').length
  const anyRunning = chunks.some((c) => c.status === 'running')
  const allDone = chunks.every((c) => c.status === 'done' || c.status === 'failed')

  let status: StageStatus = 'pending'
  if (allDone && failed === 0) status = 'done'
  else if (allDone && failed > 0) status = 'failed'
  else if (anyRunning || completed > 0) status = 'running'
  else if (chunks.some((c) => c.status === 'queued')) status = 'queued'

  const fraction = chunks.length > 0 ? completed / chunks.length : 0

  // Timing from earliest start to latest end
  const starts = jobs.filter((j) => j.started_at).map((j) => new Date(j.started_at!).getTime())
  const ends = jobs.filter((j) => j.completed_at).map((j) => new Date(j.completed_at!).getTime())
  const startedAt = starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null
  const completedAt = allDone && ends.length === jobs.length ? new Date(Math.max(...ends)).toISOString() : null
  const durationMs = startedAt
    ? (completedAt ? new Date(completedAt).getTime() : Date.now()) - new Date(startedAt).getTime()
    : null

  return {
    id: stageId,
    label: meta.label,
    description: meta.description,
    status,
    weight: meta.weight,
    completedFraction: fraction,
    chunks,
    timing: { startedAt, completedAt, durationMs },
  }
}

// ── Build full pipeline stages ─────────────────────────────────────

export function buildPipelineStages(
  jobs: WorkflowJobWithSteps[],
  researchers: ResearcherInfo[],
  _artifacts: WorkflowArtifact[],
): StageProgress[] {
  // Check for old monolithic pipeline
  const hasNewPipeline = jobs.some((j) => j.name.startsWith('Combine') || j.name.startsWith('Finalize'))

  if (!hasNewPipeline) {
    // Old monolithic "Run data pipeline" job
    const processJob = jobs.find((j) => j.name.startsWith('Run data pipeline'))
    const scrapeJobs = jobs.filter((j) => /^Scrape chunk/i.test(j.name))
    const deployJob = jobs.find((j) => j.name.startsWith('Build & deploy'))

    const stages: StageProgress[] = []

    if (scrapeJobs.length > 0) {
      stages.push(buildMatrixStage('scrape', scrapeJobs, researchers))
    }

    if (processJob) {
      stages.push({
        ...buildSingleJobStage('finalize', processJob),
        label: 'Processing Data',
        description: 'Running the data processing pipeline',
        weight: 0.85,
      })
    }

    if (deployJob) {
      stages.push(buildSingleJobStage('deploy', deployJob))
    }

    return stages
  }

  // New multi-stage pipeline
  const prepareJob = jobs.find((j) => j.name.startsWith('Prepare'))
  const scrapeJobs = jobs.filter((j) => /^Scrape chunk/i.test(j.name))
  const combineJob = jobs.find((j) => j.name.startsWith('Combine'))
  const summarizeJobs = jobs.filter((j) => /^Generate summaries chunk/i.test(j.name))
  const finalizeJob = jobs.find((j) => j.name.startsWith('Finalize'))
  const deployJob = jobs.find((j) => j.name.startsWith('Build & deploy'))

  return STAGE_ORDER.map((stageId) => {
    switch (stageId) {
      case 'prepare':   return buildSingleJobStage('prepare', prepareJob)
      case 'scrape':    return buildMatrixStage('scrape', scrapeJobs, researchers)
      case 'combine':   return buildSingleJobStage('combine', combineJob)
      case 'summarize': return buildMatrixStage('summarize', summarizeJobs, researchers)
      case 'finalize':  return buildSingleJobStage('finalize', finalizeJob)
      case 'deploy':    return buildSingleJobStage('deploy', deployJob)
    }
  })
}

// ── Overall progress (weighted) ────────────────────────────────────

export function computeOverallProgress(stages: StageProgress[]): number {
  if (stages.length === 0) return 0
  const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0)
  if (totalWeight === 0) return 0
  const weighted = stages.reduce((sum, s) => sum + s.weight * s.completedFraction, 0)
  return Math.round((weighted / totalWeight) * 100)
}

// ── Log parsers ───────────────────────────────────────────────────

const RE_STARTING   = /\[Thread-\d+\] Starting: (.+?) \(Scholar ID: .+?\) \(Attempt #(\d+)\)/
const RE_SUCCESS    = /\[Thread-\d+\] SUCCESS: (.+?) \((\d+\.?\d*)s\) \(Attempt #(\d+)\)/
const RE_FAILED     = /\[Thread-\d+\] FAILED: (.+?) \((\d+\.?\d*)s\) \(Attempt #(\d+)\)/
const RE_EXHAUSTED  = /\[Thread-\d+\] EXHAUSTED: (.+?) failed after (\d+) attempts/
const RE_TIMEOUT    = /\[Thread-\d+\] TIMEOUT: (.+?) exceeded/
const RE_PROGRESS   = /PROGRESS_JSON:(.+)$/

export function parseScraperLogs(logText: string, researcherNames: string[]): Map<string, ResearcherLogStatus> {
  const map = new Map<string, ResearcherLogStatus>()
  const nameSet = new Set(researcherNames)
  let lastProgressJson: string | null = null

  for (const line of logText.split('\n')) {
    // Check for PROGRESS_JSON (Tier 2 fallback)
    const progressMatch = line.match(RE_PROGRESS)
    if (progressMatch) {
      lastProgressJson = progressMatch[1]
      continue
    }

    let m: RegExpMatchArray | null

    if ((m = line.match(RE_SUCCESS))) {
      const [, name, dur, att] = m
      if (nameSet.has(name)) {
        map.set(name, { status: 'success', attempts: parseInt(att), durationSec: parseFloat(dur) })
      }
    } else if ((m = line.match(RE_EXHAUSTED))) {
      const [, name, att] = m
      if (nameSet.has(name)) {
        map.set(name, { status: 'exhausted', attempts: parseInt(att), durationSec: null })
      }
    } else if ((m = line.match(RE_TIMEOUT))) {
      const [, name] = m
      if (nameSet.has(name)) {
        map.set(name, { status: 'timeout', attempts: map.get(name)?.attempts ?? 1, durationSec: null })
      }
    } else if ((m = line.match(RE_FAILED))) {
      const [, name, dur, att] = m
      if (nameSet.has(name)) {
        map.set(name, { status: 'retrying', attempts: parseInt(att), durationSec: parseFloat(dur) })
      }
    } else if ((m = line.match(RE_STARTING))) {
      const [, name, att] = m
      if (nameSet.has(name) && !map.has(name)) {
        map.set(name, { status: 'scraping', attempts: parseInt(att), durationSec: null })
      } else if (nameSet.has(name)) {
        const prev = map.get(name)!
        if (prev.status === 'retrying' || prev.status === 'scraping') {
          map.set(name, { status: 'scraping', attempts: parseInt(att), durationSec: null })
        }
      }
    }
  }

  // If PROGRESS_JSON found, prefer it as the authoritative source
  if (lastProgressJson) {
    try {
      const data = JSON.parse(lastProgressJson) as {
        success?: string[]; pending?: string[]; failed_retrying?: string[]; failed_exhausted?: string[]
      }
      const jsonMap = new Map<string, ResearcherLogStatus>()
      for (const name of data.success ?? []) {
        if (nameSet.has(name)) jsonMap.set(name, { status: 'success', attempts: map.get(name)?.attempts ?? 1, durationSec: map.get(name)?.durationSec ?? null })
      }
      for (const name of data.failed_exhausted ?? []) {
        if (nameSet.has(name)) jsonMap.set(name, { status: 'exhausted', attempts: map.get(name)?.attempts ?? 1, durationSec: null })
      }
      for (const name of data.failed_retrying ?? []) {
        if (nameSet.has(name)) jsonMap.set(name, { status: 'retrying', attempts: map.get(name)?.attempts ?? 1, durationSec: null })
      }
      for (const name of data.pending ?? []) {
        if (nameSet.has(name) && !jsonMap.has(name)) jsonMap.set(name, { status: 'pending', attempts: 0, durationSec: null })
      }
      // Fill remaining names from line-parsed map (e.g. currently scraping)
      for (const [name, status] of map) {
        if (!jsonMap.has(name)) jsonMap.set(name, status)
      }
      // Fill any unmatched researchers
      for (const name of researcherNames) {
        if (!jsonMap.has(name)) jsonMap.set(name, { status: 'pending', attempts: 0, durationSec: null })
      }
      return jsonMap
    } catch {
      // Malformed JSON, fall through to line-parsed results
    }
  }

  // Fill unmatched researchers as pending
  for (const name of researcherNames) {
    if (!map.has(name)) map.set(name, { status: 'pending', attempts: 0, durationSec: null })
  }

  return map
}

const RE_SUMMARY_DONE = /\[\d+\/\d+\]\s+(.+?)\s+—\s+done/

export function parseSummaryLogs(logText: string, researcherNames: string[]): Map<string, ResearcherLogStatus> {
  const map = new Map<string, ResearcherLogStatus>()
  const nameSet = new Set(researcherNames)

  for (const line of logText.split('\n')) {
    const m = line.match(RE_SUMMARY_DONE)
    if (m && nameSet.has(m[1])) {
      map.set(m[1], { status: 'success', attempts: 1, durationSec: null })
    }
  }

  for (const name of researcherNames) {
    if (!map.has(name)) map.set(name, { status: 'pending', attempts: 0, durationSec: null })
  }

  return map
}

// ── Name resolution from combined CSV ──────────────────────────────

export function parseNameMapping(csvText: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = csvText.split('\n')
  if (lines.length < 2) return map

  const header = parseCsvRow(lines[0]).map((c) => c.trim().toLowerCase())
  const nameIdx = header.indexOf('researcher_name')
  const idIdx = header.indexOf('google_scholar_id')
  if (nameIdx < 0 || idIdx < 0) return map

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const parts = parseCsvRow(lines[i])
    const name = parts[nameIdx]?.trim()
    const id = parts[idIdx]?.trim()
    if (name && id && !map.has(id)) {
      map.set(id, name)
    }
  }

  return map
}

