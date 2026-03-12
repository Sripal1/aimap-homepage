import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkflowProgress } from '@/hooks/useWorkflowProgress'
import { formatDuration } from '@/lib/utils'
import SegmentedProgressBar from '@/components/progress/SegmentedProgressBar'
import StageTimeline from '@/components/progress/StageTimeline'
import StageDetailPanel from '@/components/progress/StageDetailPanel'
import CompletionBanner from '@/components/progress/CompletionBanner'
import type { StageId } from '@/types'

// ── Skeleton ───────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-8 w-64 bg-white/60 backdrop-blur-sm rounded-xl" />
        <div className="h-4 w-48 bg-white/40 rounded-lg" />
        <div className="h-3 w-full bg-white/50 backdrop-blur-sm border border-white/30 rounded-full mt-4" />
      </div>
      <div className="flex gap-6">
        <div className="hidden lg:flex flex-col gap-2 w-52">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/40 backdrop-blur-sm rounded-xl" />
          ))}
        </div>
        <div className="flex-1 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/30 p-5 space-y-3">
          <div className="h-6 w-40 bg-white/60 rounded-lg" />
          <div className="h-4 w-64 bg-white/40 rounded-lg" />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-5 bg-white/30 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────

export default function ProgressPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>()
  const { token, login } = useAuth()

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Sign in Required</h2>
        <p className="mt-2 text-stone-600">Sign in with GitHub to view workflow progress.</p>
        <button
          onClick={login}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900/90 backdrop-blur-sm text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors shadow-glass-sm"
        >
          Sign in with GitHub
        </button>
      </div>
    )
  }

  if (!owner || !repo) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-stone-600">Missing owner or repo in URL.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Subtle gradient blobs for glass to blur against */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-teal/[0.04] blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-stage-summarize/[0.03] blur-3xl" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-stage-scrape/[0.03] blur-3xl" />
      </div>
      <ProgressContent owner={owner} repo={repo} />
    </div>
  )
}

function ProgressContent({ owner, repo }: { owner: string; repo: string }) {
  const {
    pipeline,
    retryWorkflow,
    retryFailedJobs,
  } = useWorkflowProgress(owner, repo)

  const [selectedStageId, setSelectedStageId] = useState<StageId | null>(null)

  const repoUrl = `https://github.com/${owner}/${repo}`
  const actionsUrl = `https://github.com/${owner}/${repo}/actions`

  // Resolve active stage: user selection → running → last done → first
  const activeStageId = selectedStageId
    ?? pipeline.stages.find(s => s.status === 'running')?.id
    ?? [...pipeline.stages].reverse().find(s => s.status === 'done')?.id
    ?? pipeline.stages[0]?.id

  const activeStage = pipeline.stages.find(s => s.id === activeStageId)

  if (pipeline.loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Skeleton />
      </div>
    )
  }

  if (pipeline.overallStatus === 'waiting') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Header owner={owner} repo={repo} repoUrl={repoUrl} pipeline={pipeline} />
        {pipeline.error ? (
          <div className="mt-8 rounded-xl border border-white/40 bg-white/40 backdrop-blur-xl px-4 py-3 text-sm text-amber-700 shadow-glass-sm">
            <p className="font-medium">{pipeline.error}</p>
            <p className="text-amber-500 text-xs mt-0.5">Will automatically resume polling.</p>
          </div>
        ) : (
          <div className="mt-8 flex items-center gap-3 text-sm text-stone-500">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            <span>Waiting for workflow to start...</span>
          </div>
        )}
        <PageFooter actionsUrl={actionsUrl} />
      </div>
    )
  }

  // Terminal states: full completion view replaces monitoring UI
  if (pipeline.overallStatus === 'done' || pipeline.overallStatus === 'failed') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
        <CompletionBanner
          pipeline={pipeline}
          owner={owner}
          repo={repo}
          onRetryWorkflow={retryWorkflow}
          onRetryFailedJobs={retryFailedJobs}
        />
        <PageFooter actionsUrl={actionsUrl} />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-6">
      {/* Header */}
      <Header owner={owner} repo={repo} repoUrl={repoUrl} pipeline={pipeline} />

      {/* Segmented progress bar */}
      {pipeline.stages.length > 0 && (
        <SegmentedProgressBar
          stages={pipeline.stages}
          overallProgress={pipeline.overallProgress}
        />
      )}

      {/* Error banner */}
      {pipeline.error && (
        <div className="rounded-xl border border-white/40 bg-white/40 backdrop-blur-xl px-4 py-3 text-sm text-red-700 shadow-glass-sm animate-slide-up">
          <div className="absolute inset-0 bg-red-500/5 rounded-xl pointer-events-none" />
          <p className="font-medium relative z-10">Error polling workflow</p>
          <p className="text-red-500 text-xs mt-0.5 relative z-10">{pipeline.error}</p>
        </div>
      )}

      {/* Two-column layout: Timeline + Detail Panel */}
      {pipeline.stages.length > 0 && (
        <div className="flex gap-6 items-start">
          <StageTimeline
            stages={pipeline.stages}
            activeStageId={activeStageId}
            onSelectStage={(id) => setSelectedStageId(id)}
          />
          {activeStage && (
            <div className="flex-1 min-w-0 rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl shadow-glass p-5">
              <StageDetailPanel stage={activeStage} />
            </div>
          )}
        </div>
      )}

      <PageFooter actionsUrl={actionsUrl} />
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────

function Header({
  owner,
  repo,
  repoUrl,
  pipeline,
}: {
  owner: string
  repo: string
  repoUrl: string
  pipeline: { universityName: string | null; departmentName: string | null; totalDurationMs: number | null; overallStatus: string; overallProgress: number }
}) {
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-stone-900">Generating Research Map</h1>
        {pipeline.overallStatus === 'running' && (
          <span className="text-lg font-semibold text-stone-700 tabular-nums">{pipeline.overallProgress}%</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-stone-500 flex-wrap">
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-brand-teal hover:underline inline-flex items-center gap-1"
        >
          {owner}/{repo}
          <ExternalLink className="h-3 w-3" />
        </a>
        {pipeline.universityName && (
          <>
            <span className="text-stone-300">·</span>
            <span>{pipeline.universityName}</span>
          </>
        )}
        {pipeline.departmentName && (
          <>
            <span className="text-stone-300">·</span>
            <span>{pipeline.departmentName}</span>
          </>
        )}
        {pipeline.totalDurationMs != null && pipeline.overallStatus !== 'loading' && pipeline.overallStatus !== 'waiting' && (
          <>
            <span className="text-stone-300">·</span>
            <span className="text-stone-400 tabular-nums">{formatDuration(pipeline.totalDurationMs)} elapsed</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Footer ─────────────────────────────────────────────────────────

function PageFooter({ actionsUrl }: { actionsUrl: string }) {
  return (
    <div className="mt-8 pt-4 border-t border-white/30 flex gap-4">
      <a
        href={actionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-stone-400 hover:text-brand-teal transition-colors"
      >
        View Actions
      </a>
      <Link to="/dashboard" className="text-sm text-stone-400 hover:text-brand-teal transition-colors">
        My Maps
      </Link>
      <Link to="/" className="text-sm text-stone-400 hover:text-brand-teal transition-colors">
        Home
      </Link>
    </div>
  )
}
