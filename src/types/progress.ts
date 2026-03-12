// ── Workflow step within a job ──────────────────────────────────────
export interface WorkflowJobStep {
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: string | null
  number: number
  started_at: string | null
  completed_at: string | null
}

// ── Extended job with steps array ──────────────────────────────────
export interface WorkflowJobWithSteps {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  html_url: string
  steps: WorkflowJobStep[]
}

// ── Artifact metadata ──────────────────────────────────────────────
export interface WorkflowArtifact {
  id: number
  name: string
  size_in_bytes: number
  created_at: string
}

// ── Stage identifiers ──────────────────────────────────────────────
export type StageId = 'prepare' | 'scrape' | 'combine' | 'summarize' | 'finalize' | 'deploy'
export type StageStatus = 'pending' | 'queued' | 'running' | 'done' | 'failed'

// ── Per-researcher scrape status (from job logs) ──────────────────
export type ResearcherScrapeStatus = 'pending' | 'scraping' | 'success' | 'retrying' | 'exhausted' | 'timeout'

export interface ResearcherLogStatus {
  status: ResearcherScrapeStatus
  attempts: number
  durationSec: number | null
}

// ── Researcher info parsed from CSV ────────────────────────────────
export interface ResearcherInfo {
  name: string
  displayName?: string
  scholarUrl?: string
  scholarId?: string
  chunkIndex: number
}

// ── Per-chunk status ───────────────────────────────────────────────
export interface ChunkStatus {
  chunkIndex: number
  status: StageStatus
  researchers: ResearcherInfo[]
  jobUrl: string
  jobId: number
  startedAt: string | null
  completedAt: string | null
  steps: WorkflowJobStep[]
  researcherStatuses?: Map<string, ResearcherLogStatus>
}

// ── Per-stage progress ─────────────────────────────────────────────
export interface StageProgress {
  id: StageId
  label: string
  description: string
  status: StageStatus
  weight: number
  completedFraction: number
  chunks?: ChunkStatus[]
  steps?: WorkflowJobStep[]
  timing: {
    startedAt: string | null
    completedAt: string | null
    durationMs: number | null
  }
  jobUrl?: string
}

// ── Overall run status ─────────────────────────────────────────────
export type OverallStatus = 'loading' | 'waiting' | 'queued' | 'running' | 'done' | 'failed'

// ── Full pipeline state ────────────────────────────────────────────
export interface PipelineState {
  run: {
    id: number
    status: string
    conclusion: string | null
    html_url: string
    created_at: string
    updated_at: string
  } | null
  stages: StageProgress[]
  researchers: ResearcherInfo[]
  artifacts: WorkflowArtifact[]
  overallProgress: number
  overallStatus: OverallStatus
  totalDurationMs: number | null
  error: string | null
  loading: boolean
  universityName: string | null
  departmentName: string | null
}
