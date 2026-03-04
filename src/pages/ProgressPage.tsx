import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, ExternalLink, Circle, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getLatestWorkflowRun, getWorkflowJobs } from '@/lib/github'
import type { WorkflowJob } from '@/types'

type RunStatus = 'queued' | 'in_progress' | 'completed' | 'failure' | 'unknown'

interface PipelineStep {
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
  detail?: string
  url?: string
}

function matrixJobStep(
  jobs: WorkflowJob[],
  pattern: RegExp,
  label: string,
): PipelineStep | null {
  const matched = jobs.filter((j) => pattern.test(j.name))
  if (matched.length === 0) return null

  const completed = matched.filter((j) => j.status === 'completed' && j.conclusion === 'success').length
  const failed = matched.filter((j) => j.status === 'completed' && j.conclusion !== 'success')
  const total = matched.length
  const anyRunning = matched.some((j) => j.status === 'in_progress')
  const allDone = matched.every((j) => j.status === 'completed')

  let status: PipelineStep['status'] = 'pending'
  if (allDone && failed.length === 0) status = 'done'
  else if (allDone && failed.length > 0) status = 'failed'
  else if (anyRunning || completed > 0) status = 'running'

  return {
    label,
    status,
    detail: `${completed}/${total} chunks complete${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
    url: failed[0]?.html_url,
  }
}

function groupJobsIntoPipelineSteps(jobs: WorkflowJob[]): PipelineStep[] {
  const steps: PipelineStep[] = []

  // Prepare
  const prepareJob = jobs.find((j) => j.name.startsWith('Prepare'))
  if (prepareJob) {
    steps.push({
      label: 'Preparing chunks',
      status: jobStatus(prepareJob),
      url: prepareJob.html_url,
    })
  }

  // Scrape chunks (matrix jobs)
  const scrapeStep = matrixJobStep(jobs, /^Scrape chunk/, 'Scraping Google Scholar')
  if (scrapeStep) steps.push(scrapeStep)

  // Combine profiles (new pipeline)
  const combineJob = jobs.find((j) => j.name.startsWith('Combine profiles'))
  if (combineJob) {
    steps.push({
      label: 'Combining profiles',
      status: jobStatus(combineJob),
      url: combineJob.html_url,
    })
  }

  // Summarize chunks (new pipeline, matrix jobs)
  const summarizeStep = matrixJobStep(jobs, /^Generate summaries chunk/, 'Generating summaries')
  if (summarizeStep) steps.push(summarizeStep)

  // Finalize (new pipeline)
  const finalizeJob = jobs.find((j) => j.name.startsWith('Finalize pipeline'))
  if (finalizeJob) {
    steps.push({
      label: 'Finalizing pipeline',
      status: jobStatus(finalizeJob),
      url: finalizeJob.html_url,
    })
  }

  // Backward compat: old monolithic "Run data pipeline" job
  if (!combineJob && !finalizeJob) {
    const processJob = jobs.find((j) => j.name.startsWith('Run data pipeline'))
    if (processJob) {
      steps.push({
        label: 'Processing Data',
        status: jobStatus(processJob),
        url: processJob.html_url,
      })
    }
  }

  // Deploy
  const deployJob = jobs.find((j) => j.name.startsWith('Build & deploy'))
  if (deployJob) {
    steps.push({
      label: 'Building & Deploying',
      status: jobStatus(deployJob),
      url: deployJob.html_url,
    })
  }

  return steps
}

function jobStatus(job: WorkflowJob): PipelineStep['status'] {
  if (job.status === 'completed') {
    return job.conclusion === 'success' ? 'done' : 'failed'
  }
  if (job.status === 'in_progress') return 'running'
  return 'pending'
}

export default function ProgressPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>()
  const { token, login } = useAuth()
  const [status, setStatus] = useState<RunStatus>('queued')
  const [conclusion, setConclusion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([])

  useEffect(() => {
    if (!token || !owner || !repo) return

    let cancelled = false

    const poll = async () => {
      try {
        const run = await getLatestWorkflowRun(token, owner, repo)
        if (cancelled) return

        if (!run) {
          setStatus('queued')
          return
        }

        if (run.status === 'completed') {
          setStatus('completed')
          setConclusion(run.conclusion)
        } else {
          setStatus(run.status === 'in_progress' ? 'in_progress' : 'queued')
        }

        // Fetch job-level details
        const jobs = await getWorkflowJobs(token, owner, repo, run.id)
        if (!cancelled) {
          setPipelineSteps(groupJobsIntoPipelineSteps(jobs))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Polling failed')
      }
    }

    poll()
    const interval = setInterval(poll, 10_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [token, owner, repo])

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Sign in Required</h2>
        <p className="mt-2 text-stone-600">Sign in with GitHub to view workflow progress.</p>
        <button
          onClick={login}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-md hover:bg-stone-800 transition-colors"
        >
          Sign in with GitHub
        </button>
      </div>
    )
  }

  const pagesUrl = `https://${owner}.github.io/${repo}/`
  const actionsUrl = `https://github.com/${owner}/${repo}/actions`
  const repoUrl = `https://github.com/${owner}/${repo}`

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-stone-900">Generation Progress</h1>
      <p className="mt-2 text-stone-600">
        Tracking the workflow for{' '}
        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-brand-teal hover:underline">
          {owner}/{repo}
        </a>
      </p>

      <div className="mt-10 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Setup</p>
        <StepRow status="done" label="Repository created" />
        <StepRow status="done" label="Configuration pushed" />
        <StepRow status="done" label="Researchers data pushed" />
        <StepRow status="done" label="API key stored as secret" />
        <StepRow status="done" label="Workflow triggered" />

        {pipelineSteps.length > 0 && (
          <>
            <div className="border-t border-stone-200 pt-4 mt-4" />
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Pipeline</p>
            {pipelineSteps.map((s, i) => (
              <StepRow key={i} status={s.status} label={s.label} detail={s.detail} url={s.url} />
            ))}
          </>
        )}

        <div className="border-t border-stone-200 pt-4 mt-4">
          {error && (
            <div className="flex items-start gap-3 text-red-600 text-sm">
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error polling workflow</p>
                <p className="text-red-500">{error}</p>
              </div>
            </div>
          )}

          {!error && status === 'completed' && conclusion === 'success' && (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle className="h-12 w-12 text-brand-teal" />
              <h2 className="mt-3 text-xl font-bold text-stone-900">Map Generated!</h2>
              <p className="mt-1 text-sm text-stone-600">Your research map is live.</p>
              <a
                href={pagesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-medium rounded-md hover:bg-brand-teal-dark transition-colors"
              >
                View Your Map
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {!error && status === 'completed' && conclusion !== 'success' && (
            <div className="flex flex-col items-center text-center py-4">
              <XCircle className="h-12 w-12 text-red-500" />
              <h2 className="mt-3 text-xl font-bold text-stone-900">Workflow Failed</h2>
              <p className="mt-1 text-sm text-stone-600">
                The generation workflow did not succeed (conclusion: {conclusion}).
              </p>
              <a
                href={actionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 text-sm font-medium rounded-md hover:bg-stone-50 transition-colors"
              >
                View Actions Log
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {!error && status !== 'completed' && (
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <span>
                {status === 'in_progress' ? 'Workflow running...' : 'Waiting for workflow to start...'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <a
          href={actionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-stone-500 hover:text-brand-teal transition-colors"
        >
          View Actions
        </a>
        <Link to="/" className="text-sm text-stone-500 hover:text-brand-teal transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}

function StepRow({ status, label, detail, url }: { status: PipelineStep['status']; label: string; detail?: string; url?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {status === 'done' && <CheckCircle className="h-5 w-5 text-brand-teal flex-shrink-0" />}
      {status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-brand-teal flex-shrink-0" />}
      {status === 'pending' && <Circle className="h-5 w-5 text-stone-300 flex-shrink-0" />}
      {status === 'failed' && <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />}
      <span className={status === 'pending' ? 'text-stone-400' : status === 'failed' ? 'text-red-600' : 'text-stone-700'}>
        {label}
      </span>
      {detail && <span className="text-stone-400 text-xs">({detail})</span>}
      {status === 'failed' && url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:underline ml-1">
          View log
        </a>
      )}
    </div>
  )
}
