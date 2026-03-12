import { useState, useMemo } from 'react'
import {
  CheckCircle, XCircle, ExternalLink, Copy, RotateCcw, RefreshCw,
  Download, FileArchive, Database, FileText, Map as MapIcon, Loader2,
  ChevronDown, UserPlus, History, Check, AlertTriangle, Search,
} from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { downloadArtifact } from '@/lib/github'
import { STAGE_HSL_MAP } from '@/components/progress/stage-colors'
import SegmentedProgressBar from './SegmentedProgressBar'
import ResearcherList from './ResearcherList'
import type { PipelineState, StageProgress, WorkflowArtifact, StageId, ResearcherInfo, ResearcherLogStatus, ResearcherScrapeStatus } from '@/types'

interface Props {
  pipeline: PipelineState
  owner: string
  repo: string
  onRetryWorkflow: () => void
  onRetryFailedJobs: () => void
}

// ── Artifact metadata mapping ────────────────────────────────────

interface ArtifactMeta {
  label: string
  icon: typeof FileArchive
  stageId: StageId | null
}

function getArtifactMeta(name: string): ArtifactMeta {
  if (/^researcher-profiles-\d+$/i.test(name)) {
    const chunk = name.match(/(\d+)$/)?.[1] ?? '?'
    return { label: `Researcher Profiles (Batch ${chunk})`, icon: Database, stageId: 'scrape' }
  }
  if (name === 'combined-csv') {
    return { label: 'Combined Profiles', icon: FileText, stageId: 'combine' }
  }
  if (/^summary-progress-\d+$/i.test(name)) {
    const chunk = name.match(/(\d+)$/)?.[1] ?? '?'
    return { label: `Research Summaries (Batch ${chunk})`, icon: FileText, stageId: 'summarize' }
  }
  if (name === 'pipeline-output') {
    return { label: 'Final Map Data', icon: MapIcon, stageId: 'finalize' }
  }
  return {
    label: name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: FileArchive,
    stageId: null,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Researcher status aggregation ─────────────────────────────────

const STATUS_SEVERITY: Record<ResearcherScrapeStatus, number> = {
  success: 0,
  pending: 1,
  scraping: 2,
  retrying: 3,
  timeout: 4,
  exhausted: 5,
}

function isWorseStatus(candidate: ResearcherLogStatus, existing: ResearcherLogStatus): boolean {
  return (STATUS_SEVERITY[candidate.status] ?? 0) > (STATUS_SEVERITY[existing.status] ?? 0)
}

function aggregateResearcherStatuses(pipeline: PipelineState) {
  const allStatuses: Map<string, ResearcherLogStatus> = new Map()
  const allResearchers: ResearcherInfo[] = []
  const seenNames = new Set<string>()

  for (const stage of pipeline.stages) {
    stage.chunks?.forEach(chunk => {
      chunk.researcherStatuses?.forEach((status, name) => {
        const existing = allStatuses.get(name)
        if (!existing || isWorseStatus(status, existing)) {
          allStatuses.set(name, status)
        }
      })
      chunk.researchers.forEach(r => {
        if (!seenNames.has(r.name)) {
          seenNames.add(r.name)
          allResearchers.push(r)
        }
      })
    })
  }

  const hasStatusData = allStatuses.size > 0
  const successResearchers: ResearcherInfo[] = []
  const failedResearchers: ResearcherInfo[] = []

  for (const r of allResearchers) {
    const entry = allStatuses.get(r.name)
    if (!hasStatusData || !entry || entry.status === 'success') {
      successResearchers.push(r)
    } else {
      failedResearchers.push(r)
    }
  }

  return {
    allStatuses,
    allResearchers,
    successResearchers,
    failedResearchers,
    successCount: successResearchers.length,
    failedCount: failedResearchers.length,
  }
}

// ── Researcher Results — two-pane scrollable card ────────────────

function filterResearchers(list: ResearcherInfo[], query: string): ResearcherInfo[] {
  if (!query) return list
  const q = query.toLowerCase()
  return list.filter(r => {
    const name = (r.displayName || r.name).toLowerCase()
    return name.includes(q)
  })
}

function ResearcherResults({
  pipeline,
}: {
  pipeline: PipelineState
}) {
  const { allStatuses, allResearchers, successResearchers, failedResearchers } = aggregateResearcherStatuses(pipeline)
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const filteredSuccess = useMemo(() => filterResearchers(successResearchers, search), [successResearchers, search])
  const filteredFailed = useMemo(() => filterResearchers(failedResearchers, search), [failedResearchers, search])

  if (allResearchers.length === 0) return null

  const hasFailed = failedResearchers.length > 0
  const statusMap = allStatuses.size > 0 ? allStatuses : undefined
  const noResults = search && filteredSuccess.length === 0 && filteredFailed.length === 0

  return (
    <div className="rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl p-5 shadow-glass">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-stone-700">Researcher Results</h3>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className={`text-[10px] ${hasFailed ? 'text-red-400' : 'text-stone-400'}`}>
              {hasFailed
                ? `${failedResearchers.length} of ${allResearchers.length} failed`
                : `All ${allResearchers.length} processed`}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 animate-slide-up">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search researchers..."
              className="w-full pl-9 pr-3 py-2 text-xs text-stone-700 placeholder:text-stone-300 bg-white/60 border border-stone-200/50 rounded-lg outline-none focus:border-stone-300 focus:ring-1 focus:ring-stone-200/50 transition-colors"
            />
            {search && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 tabular-nums">
                {filteredSuccess.length + filteredFailed.length} of {allResearchers.length}
              </span>
            )}
          </div>

          {noResults ? (
            <p className="text-xs text-stone-400 text-center py-6">
              No researchers matching &ldquo;{search}&rdquo;
            </p>
          ) : (
            <div className={hasFailed && filteredSuccess.length > 0 && filteredFailed.length > 0
              ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
              : 'space-y-4'
            }>
              {/* Success pane */}
              {filteredSuccess.length > 0 && (
                <div className={`rounded-xl border bg-gradient-to-b from-white/80 to-white/40 ${hasFailed ? 'border-emerald-100/60' : 'border-stone-100/60'}`}>
                  <div className="px-4 py-3 border-b border-stone-100/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-3.5 w-3.5 ${hasFailed ? 'text-emerald-500' : 'text-brand-teal'}`} />
                        <span className="text-xs font-semibold text-stone-700">Successfully Mapped</span>
                      </div>
                      <span className="text-[11px] text-stone-400 tabular-nums">
                        {search ? `${filteredSuccess.length} of ${successResearchers.length}` : successResearchers.length}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 overflow-y-auto ${filteredSuccess.length > 8 ? 'max-h-96' : ''}`}>
                    <ResearcherList
                      researchers={filteredSuccess}
                      researcherStatuses={statusMap}
                      stageStatus="done"
                      compact={hasFailed}
                    />
                  </div>
                </div>
              )}

              {/* Failure pane */}
              {hasFailed && filteredFailed.length > 0 && (
                <div className="rounded-xl border border-red-100/60 bg-gradient-to-b from-red-50/30 to-white/40">
                  <div className="px-4 py-3 border-b border-red-100/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                        <span className="text-xs font-semibold text-stone-700">Failed to Process</span>
                      </div>
                      <span className="text-[11px] text-red-400 tabular-nums">
                        {search ? `${filteredFailed.length} of ${failedResearchers.length}` : failedResearchers.length}
                      </span>
                    </div>
                    {!search && (
                      <p className="mt-1 text-[11px] text-stone-400 leading-snug">
                        {failedResearchers.length === 1
                          ? 'This researcher could not be processed due to scraping errors.'
                          : `These ${failedResearchers.length} researchers could not be processed due to scraping errors.`}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 overflow-y-auto ${filteredFailed.length > 8 ? 'max-h-96' : ''}`}>
                    <ResearcherList
                      researchers={filteredFailed}
                      researcherStatuses={statusMap}
                      stageStatus="done"
                      compact={hasFailed}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Compact artifact download row ────────────────────────────────

function ArtifactRow({
  artifact,
  owner,
  repo,
}: {
  artifact: WorkflowArtifact
  owner: string
  repo: string
}) {
  const { token } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const meta = getArtifactMeta(artifact.name)
  const Icon = meta.icon

  const handleDownload = async () => {
    if (!token || downloading) return
    setDownloading(true)
    try {
      await downloadArtifact(token, owner, repo, artifact.id, artifact.name)
    } catch (err) {
      console.error('Failed to download artifact:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={!token || downloading}
      className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-white/50 transition-colors disabled:opacity-50 group"
    >
      <Icon className="h-3 w-3 text-stone-400 flex-shrink-0" />
      <span className="text-stone-600 truncate">{meta.label}</span>
      <span className="text-[10px] text-stone-400 tabular-nums flex-shrink-0">{formatBytes(artifact.size_in_bytes)}</span>
      <span className="flex-shrink-0 text-stone-300 group-hover:text-brand-teal transition-colors">
        {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      </span>
    </button>
  )
}

// ── Pipeline Summary (vertical timeline with collapsible details) ─

function PipelineSummary({
  stages,
  artifacts,
  owner,
  repo,
  defaultExpanded = false,
}: {
  stages: StageProgress[]
  artifacts: WorkflowArtifact[]
  owner: string
  repo: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (stages.length === 0) return null

  // Group artifacts by the stage that produced them
  const artifactsByStage: Partial<Record<StageId, WorkflowArtifact[]>> = {}
  const ungrouped: WorkflowArtifact[] = []
  for (const artifact of artifacts) {
    const meta = getArtifactMeta(artifact.name)
    if (meta.stageId) {
      const list = artifactsByStage[meta.stageId] ?? []
      list.push(artifact)
      artifactsByStage[meta.stageId] = list
    } else {
      ungrouped.push(artifact)
    }
  }

  const totalFiles = artifacts.length

  return (
    <div className="relative rounded-2xl border border-white/50 bg-white/40 backdrop-blur-2xl shadow-glass overflow-hidden">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/20 pointer-events-none" />

      <div className="relative z-10 px-5 py-4">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between group"
        >
          <h3 className="text-[13px] font-semibold text-stone-700 tracking-tight">Pipeline Summary</h3>
          <div className="flex items-center gap-2">
            {!expanded && totalFiles > 0 && (
              <span className="text-[10px] text-stone-400">{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
            )}
            <div className="w-5 h-5 rounded-md bg-white/60 border border-white/50 flex items-center justify-center group-hover:bg-white/80 transition-colors">
              <ChevronDown className={`h-3 w-3 text-stone-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {/* Vertical timeline */}
        <div className="mt-3">
          {stages.map((stage, i) => {
            const hsl = STAGE_HSL_MAP[stage.id]
            const isFailed = stage.status === 'failed'
            const isDone = stage.status === 'done'
            const duration = stage.timing.durationMs ? formatDuration(stage.timing.durationMs) : null
            const stageArtifacts = artifactsByStage[stage.id] ?? []
            const isLast = i === stages.length - 1

            return (
              <div key={stage.id} className="relative flex gap-2.5">
                {/* Timeline rail */}
                <div className="flex flex-col items-center flex-shrink-0 w-4">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-[3px] ring-2 ring-white/80"
                    style={{
                      backgroundColor: isFailed ? 'rgb(239, 68, 68)' : isDone ? `hsl(${hsl})` : '#d6d3d1',
                      boxShadow: isDone ? `0 0 6px hsla(${hsl}, 0.3)` : undefined,
                    }}
                  />
                  {!isLast && (
                    <div
                      className="w-px flex-1"
                      style={{
                        background: isDone
                          ? `linear-gradient(to bottom, hsla(${hsl}, 0.3), hsla(${STAGE_HSL_MAP[stages[i + 1].id]}, 0.15))`
                          : '#e7e5e4',
                        minHeight: expanded ? '20px' : '12px',
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? '' : expanded ? 'pb-2.5' : 'pb-1'}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-[12px] font-medium leading-tight ${isFailed ? 'text-red-600' : isDone ? 'text-stone-700' : 'text-stone-400'}`}>
                      {stage.label}
                    </span>
                    {duration && (
                      <span className="text-[10px] text-stone-400/70 tabular-nums flex-shrink-0">{duration}</span>
                    )}
                  </div>

                  {/* Expanded: description + artifacts */}
                  {expanded && (
                    <div className="mt-0.5">
                      <p className="text-[11px] text-stone-400/80 leading-relaxed">{stage.description}</p>
                      {stageArtifacts.length > 0 && (
                        <div className="mt-1 -ml-1 space-y-px">
                          {stageArtifacts.map((artifact) => (
                            <ArtifactRow key={artifact.id} artifact={artifact} owner={owner} repo={repo} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Ungrouped artifacts — only when expanded */}
        {expanded && ungrouped.length > 0 && (
          <div className="mt-2 pt-2 border-t border-stone-200/30">
            <span className="text-[10px] text-stone-400 font-medium">Other Files</span>
            <div className="mt-1 -ml-1 space-y-px">
              {ungrouped.map((artifact) => (
                <ArtifactRow key={artifact.id} artifact={artifact} owner={owner} repo={repo} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Management Actions ───────────────────────────────────────────

const UPCOMING_ACTIONS = [
  { icon: UserPlus, title: 'Add Researchers', description: 'Add new faculty to your existing map' },
  { icon: RefreshCw, title: 'Refresh Data', description: 'Re-scrape publication data for current researchers' },
  { icon: History, title: 'Run History', description: 'View past pipeline runs and their results' },
] as const

function ManagementActions() {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl p-5 shadow-glass">
      <h3 className="text-sm font-semibold text-stone-700">What&apos;s Next?</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {UPCOMING_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <div
              key={action.title}
              className="relative flex flex-col items-center text-center p-4 rounded-xl border border-white/30 bg-white/30 opacity-60 cursor-not-allowed"
            >
              <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400">
                Coming Soon
              </span>
              <Icon className="h-6 w-6 text-stone-400" />
              <span className="mt-2 text-sm font-medium text-stone-500">{action.title}</span>
              <span className="mt-1 text-xs text-stone-400">{action.description}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Error details builder ────────────────────────────────────────

function buildErrorDetails(
  pipeline: PipelineState,
  failedStage: StageProgress | undefined,
  owner: string,
  repo: string,
): string {
  const lines = [
    `Pipeline Failed \u2014 ${owner}/${repo}`,
    `Run: ${pipeline.run?.html_url ?? 'N/A'}`,
    `Conclusion: ${pipeline.run?.conclusion ?? 'unknown'}`,
    `Stage: ${failedStage?.label ?? 'unknown'}`,
  ]
  if (failedStage?.jobUrl) lines.push(`Job: ${failedStage.jobUrl}`)
  if (failedStage?.timing.startedAt) lines.push(`Started: ${failedStage.timing.startedAt}`)
  if (failedStage?.timing.completedAt) lines.push(`Completed: ${failedStage.timing.completedAt}`)

  if (failedStage?.chunks) {
    const failedChunks = failedStage.chunks.filter((c) => c.status === 'failed')
    if (failedChunks.length > 0) {
      lines.push(`Failed chunks: ${failedChunks.map((c) => c.chunkIndex).join(', ')}`)
      failedChunks.forEach((c) => {
        lines.push(`  Chunk ${c.chunkIndex}: ${c.jobUrl}`)
      })
    }
  }

  return lines.join('\n')
}

// ── Main component ───────────────────────────────────────────────

export default function CompletionBanner({
  pipeline,
  owner,
  repo,
  onRetryWorkflow,
  onRetryFailedJobs,
}: Props) {
  const [copied, setCopied] = useState(false)
  const pagesUrl = `https://${owner}.github.io/${repo}/`
  const actionsUrl = `https://github.com/${owner}/${repo}/actions`

  const done = pipeline.overallStatus === 'done'
  const researcherStats = aggregateResearcherStatuses(pipeline)

  // Filter out GitHub internal artifacts
  const allArtifacts = pipeline.artifacts.filter(
    (a) => a.name !== 'github-pages' && !a.name.startsWith('actions-')
  )
  // Exclude the mega-bundle (pipeline-output) since it duplicates stage-specific artifacts
  const visibleArtifacts = allArtifacts.filter((a) => a.name !== 'pipeline-output')
  const failedStage = pipeline.stages.find((s) => s.status === 'failed')
  const duration = pipeline.totalDurationMs ? formatDuration(pipeline.totalDurationMs) : null

  const copyUrl = () => {
    navigator.clipboard.writeText(pagesUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyErrorDetails = () => {
    const details = buildErrorDetails(pipeline, failedStage, owner, repo)
    navigator.clipboard.writeText(details)
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl p-8 shadow-glass animate-scale-in">
        {done ? (
          <>
            {/* Success tinted glass */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/8 to-brand-teal/4 pointer-events-none" />

            {/* Floating dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full animate-float"
                  style={{
                    backgroundColor: `hsla(176, 47%, 26%, ${0.15 + (i % 3) * 0.1})`,
                    left: `${8 + (i * 7.5)}%`,
                    top: `${10 + ((i * 17) % 60)}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${2 + (i % 3) * 0.5}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 text-center">
              <div className="animate-bounce-in">
                <CheckCircle className="h-16 w-16 text-brand-teal mx-auto" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-stone-900">Your Research Map is Ready</h2>
              {(pipeline.universityName || pipeline.departmentName) && (
                <p className="mt-1 text-sm text-stone-500">
                  {[pipeline.universityName, pipeline.departmentName].filter(Boolean).join(' \u00b7 ')}
                </p>
              )}

              {/* Stat pills */}
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                {pipeline.researchers.length > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-xs font-medium text-stone-600 tabular-nums">
                    {researcherStats.failedCount > 0
                      ? `${researcherStats.successCount} of ${pipeline.researchers.length} faculty mapped`
                      : `${pipeline.researchers.length} faculty mapped`}
                  </span>
                )}
                {duration && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-xs font-medium text-stone-600 tabular-nums">
                    {duration} total
                  </span>
                )}
                {pipeline.stages.filter((s) => s.status === 'done').length > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-xs font-medium text-stone-600 tabular-nums">
                    {pipeline.stages.filter((s) => s.status === 'done').length} stages completed
                  </span>
                )}
                {researcherStats.failedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50/80 backdrop-blur-sm border border-red-200/40 text-xs font-medium text-red-500 tabular-nums">
                    <AlertTriangle className="h-3 w-3" />
                    {researcherStats.failedCount} failed due to errors
                  </span>
                )}
              </div>

              {/* CTAs */}
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <a
                  href={pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-teal/90 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-brand-teal transition-colors duration-80 shadow-glass-sm"
                >
                  View Your Map
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={actionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 border border-white/50 bg-white/50 backdrop-blur-sm text-stone-600 text-sm rounded-xl hover:bg-white/70 transition-colors duration-80"
                >
                  View Actions Log
                </a>
              </div>

              {/* Copy URL */}
              <button
                onClick={copyUrl}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-brand-teal transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy map URL'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Failed tinted glass */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/6 to-red-500/3 pointer-events-none" />

            <div className="relative z-10 text-center">
              <div className="animate-bounce-in">
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-stone-900">Pipeline Failed</h2>
              <p className="mt-1 text-sm text-stone-600">
                {failedStage
                  ? `Failed during "${failedStage.label}" stage`
                  : `Workflow concluded with: ${pipeline.run?.conclusion ?? 'unknown'}`}
              </p>

              {/* CTAs */}
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={onRetryFailedJobs}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600/90 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors duration-80 shadow-glass-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Failed Jobs
                </button>
                <button
                  onClick={onRetryWorkflow}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-white/50 bg-white/50 backdrop-blur-sm text-stone-600 text-sm rounded-xl hover:bg-white/70 transition-colors duration-80"
                >
                  <RotateCcw className="h-4 w-4" />
                  Re-run Full Pipeline
                </button>
                <button
                  onClick={copyErrorDetails}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-white/50 bg-white/50 backdrop-blur-sm text-stone-600 text-sm rounded-xl hover:bg-white/70 transition-colors duration-80"
                >
                  <Copy className="h-4 w-4" />
                  Copy Error Details
                </button>
              </div>

              <a
                href={actionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-stone-400 hover:text-red-500 transition-colors duration-80"
              >
                View Actions Log &rarr;
              </a>
            </div>
          </>
        )}
      </div>

      {/* Progress bar */}
      {pipeline.stages.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}
        >
          <SegmentedProgressBar
            stages={pipeline.stages}
            overallProgress={pipeline.overallProgress}
          />
        </div>
      )}

      {/* Pipeline Summary — collapsed on success, expanded on failure */}
      <div
        className="animate-slide-up"
        style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
      >
        <PipelineSummary
          stages={pipeline.stages}
          artifacts={visibleArtifacts}
          owner={owner}
          repo={repo}
          defaultExpanded={!done}
        />
      </div>

      {/* Researcher Results — only on success with researcher data */}
      {done && researcherStats.allResearchers.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          <ResearcherResults pipeline={pipeline} />
        </div>
      )}

      {/* Management Actions */}
      <div
        className="animate-slide-up"
        style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
      >
        <ManagementActions />
      </div>
    </div>
  )
}
