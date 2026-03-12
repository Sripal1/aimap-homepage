import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useMapHistory } from '@/contexts/MapHistoryContext'
import {
  getLatestWorkflowRun,
  getWorkflowJobs,
  getRepoFileContent,
  getWorkflowArtifacts,
  getJobLogs,
  rerunWorkflow as apiRerunWorkflow,
  rerunFailedJobs as apiRerunFailedJobs,
  RateLimitError,
} from '@/lib/github'
import { buildPipelineStages, computeOverallProgress, parseResearchersCsv, parseConfigYaml, parseScraperLogs, parseSummaryLogs, parseNameMapping } from '@/lib/progress-utils'
import { getSessionJSON, setSessionJSON } from '@/lib/storage'
import type {
  PipelineState,
  StageId,
  ResearcherInfo,
  ResearcherLogStatus,
  OverallStatus,
} from '@/types'

const DEFAULT_PIPELINE: PipelineState = {
  run: null,
  stages: [],
  researchers: [],
  artifacts: [],
  overallProgress: 0,
  overallStatus: 'loading',
  totalDurationMs: null,
  error: null,
  loading: true,
  universityName: null,
  departmentName: null,
}

function sessionKey(owner: string, repo: string) {
  return `progress:expanded:${owner}/${repo}`
}

export function useWorkflowProgress(owner: string, repo: string) {
  const { token } = useAuth()
  const { updateMapStatus } = useMapHistory()

  const [pipeline, setPipeline] = useState<PipelineState>(DEFAULT_PIPELINE)

  // Expanded stage state, persisted to sessionStorage
  const [expandedStages, setExpandedStages] = useState<Set<StageId>>(() => {
    const stored = getSessionJSON<StageId[]>(sessionKey(owner, repo))
    return new Set(stored ?? [])
  })
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())
  const [pollGeneration, setPollGeneration] = useState(0)

  // Refs for one-time fetches
  const researchersRef = useRef<ResearcherInfo[]>([])
  const chunkSizeRef = useRef(50)
  const configFetchedRef = useRef(false)
  const lastSyncedStatusRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalTitleRef = useRef(document.title)
  const originalFaviconRef = useRef<string>('')
  const retryingRef = useRef(false)

  // Log-based per-researcher status caches
  const logsCacheRef = useRef<Map<number, Map<string, ResearcherLogStatus>>>(new Map())
  const completedLogsFetchedRef = useRef<Set<number>>(new Set())
  const lastRunningLogsFetchRef = useRef(0)

  // Name resolution: resolve placeholder names from combined CSV after finalize
  const namesResolvedRef = useRef(false)

  // Persist expanded stages to sessionStorage
  useEffect(() => {
    setSessionJSON(sessionKey(owner, repo), [...expandedStages])
  }, [expandedStages, owner, repo])

  // Toggle helpers
  const toggleStage = useCallback((stageId: StageId) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }, [])

  const toggleChunk = useCallback((key: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedStages(new Set<StageId>(['prepare', 'scrape', 'combine', 'summarize', 'finalize', 'deploy']))
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedStages(new Set())
    setExpandedChunks(new Set())
  }, [])

  // Fetch one-time data (CSV + config)
  useEffect(() => {
    if (!token || configFetchedRef.current) return
    configFetchedRef.current = true

    const fetchStaticData = async () => {
      try {
        const [csvText, yamlText] = await Promise.all([
          getRepoFileContent(token, owner, repo, 'researchers.csv').catch(() => ''),
          getRepoFileContent(token, owner, repo, 'researchmap.config.yaml').catch(() => ''),
        ])

        if (yamlText) {
          const config = parseConfigYaml(yamlText)
          chunkSizeRef.current = config.chunkSize
          setPipeline((prev) => ({
            ...prev,
            universityName: config.universityName || null,
            departmentName: config.departmentName || null,
          }))
        }

        if (csvText) {
          const researchers = parseResearchersCsv(csvText, chunkSizeRef.current)
          researchersRef.current = researchers
          setPipeline((prev) => ({ ...prev, researchers }))
        }
      } catch {
        // Non-fatal: we just won't have researcher names
      }
    }

    fetchStaticData()
  }, [token, owner, repo])

  // Track previous running stage to auto-collapse when it completes
  const prevRunningStageRef = useRef<StageId | null>(null)

  // Main polling loop with adaptive intervals
  useEffect(() => {
    if (!token) return

    let cancelled = false
    let currentIntervalMs = 5_000

    const schedulePoll = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = setInterval(poll, currentIntervalMs)
    }

    const poll = async () => {
      try {
        const run = await getLatestWorkflowRun(token, owner, repo)
        if (cancelled) return

        if (!run) {
          setPipeline((prev) => ({
            ...prev,
            loading: false,
            overallStatus: 'waiting',
          }))
          return
        }

        // Fetch jobs and artifacts in parallel
        const [jobs, artifacts] = await Promise.all([
          getWorkflowJobs(token, owner, repo, run.id),
          getWorkflowArtifacts(token, owner, repo, run.id).catch(() => []),
        ])
        if (cancelled) return

        const stages = buildPipelineStages(jobs, researchersRef.current, artifacts)

        // Fetch per-researcher logs for scrape/summarize chunks
        const now = Date.now()
        const logFetchPromises: Promise<void>[] = []

        for (const stage of stages) {
          if ((stage.id !== 'scrape' && stage.id !== 'summarize') || !stage.chunks) continue

          for (const chunk of stage.chunks) {
            if (!chunk.jobId || chunk.researchers.length === 0) continue
            console.debug(`[logs] stage=${stage.id} chunk=${chunk.chunkIndex} jobId=${chunk.jobId} status=${chunk.status} cachedCompleted=${completedLogsFetchedRef.current.has(chunk.jobId)} timeSinceLastRunning=${now - lastRunningLogsFetchRef.current}ms`)
            const names = chunk.researchers.map((r) => r.name)

            if ((chunk.status === 'done' || chunk.status === 'failed') && !completedLogsFetchedRef.current.has(chunk.jobId)) {
              logFetchPromises.push(
                getJobLogs(token, owner, repo, chunk.jobId).then((logText) => {
                  if (logText) {
                    const parsed = stage.id === 'scrape'
                      ? parseScraperLogs(logText, names)
                      : parseSummaryLogs(logText, names)
                    logsCacheRef.current.set(chunk.jobId, parsed)
                    // Only mark as definitively fetched if every researcher resolved
                    // to a terminal status. If the log was truncated, some may still
                    // be 'scraping' — leave the door open to retry next poll.
                    const allTerminal = [...parsed.values()].every(
                      (s) => s.status === 'success' || s.status === 'exhausted' || s.status === 'timeout'
                    )
                    if (allTerminal) {
                      completedLogsFetchedRef.current.add(chunk.jobId)
                    }
                  }
                  // Don't mark as fetched if logText was empty — retry next poll
                })
              )
            } else if (chunk.status === 'running' && now - lastRunningLogsFetchRef.current >= 24_000
              && chunk.startedAt && now - new Date(chunk.startedAt).getTime() >= 30_000) {
              logFetchPromises.push(
                getJobLogs(token, owner, repo, chunk.jobId).then((logText) => {
                  if (logText) {
                    const parsed = stage.id === 'scrape'
                      ? parseScraperLogs(logText, names)
                      : parseSummaryLogs(logText, names)
                    logsCacheRef.current.set(chunk.jobId, parsed)
                  }
                })
              )
            }
          }
        }

        if (logFetchPromises.length > 0) {
          // Rate-limit: max 3 concurrent fetches
          const batches: Promise<void>[][] = []
          for (let i = 0; i < logFetchPromises.length; i += 3) {
            batches.push(logFetchPromises.slice(i, i + 3))
          }
          for (const batch of batches) {
            await Promise.allSettled(batch)
          }
          if (stages.some((s) => s.chunks?.some((c) => c.status === 'running'))) {
            lastRunningLogsFetchRef.current = now
          }
        }

        // Merge cached log statuses into chunks
        let mergedCount = 0
        for (const stage of stages) {
          if (!stage.chunks) continue
          for (const chunk of stage.chunks) {
            const cached = logsCacheRef.current.get(chunk.jobId)
            if (cached) {
              chunk.researcherStatuses = cached
              mergedCount++
            }
          }
        }
        if (mergedCount > 0) console.debug(`[logs] Merged researcher statuses into ${mergedCount} chunks`)

        // Reconcile stale researcher statuses with chunk completion status.
        // Only apply as a last resort: when the pipeline is done and we've exhausted
        // retries (i.e. the chunk's logs are in completedLogsFetchedRef, meaning we
        // got the best log data we're going to get, OR the run itself is completed
        // and there will be no more poll cycles).
        // Note: a chunk can be 'done' (job succeeded) while individual researchers
        // exhausted/timed out — so we can't assume done = all succeeded.
        // We clear the spinner but show a neutral 'success' only for 'pending'
        // researchers (never scraped at all in a done chunk = likely fine).
        // For 'scraping' researchers we can't know the true outcome, so we also
        // default to 'success' since the job did succeed — but only once retries
        // are truly exhausted (run completed).
        if (run.status === 'completed') {
          for (const stage of stages) {
            if (!stage.chunks) continue
            for (const chunk of stage.chunks) {
              if (!chunk.researcherStatuses) continue
              if (chunk.status !== 'done' && chunk.status !== 'failed') continue
              for (const [name, entry] of chunk.researcherStatuses) {
                if (entry.status === 'scraping' || entry.status === 'pending') {
                  chunk.researcherStatuses.set(name, {
                    ...entry,
                    status: chunk.status === 'done' ? 'success' : 'exhausted',
                  })
                }
              }
            }
          }
        }

        // Resolve placeholder names from combined CSV after finalize commits it to the repo
        const hasPlaceholders = researchersRef.current.some((r) => r.displayName && r.displayName !== r.name)
        if (hasPlaceholders && !namesResolvedRef.current) {
          const finalizeStage = stages.find((s) => s.id === 'finalize')
          if (finalizeStage && finalizeStage.status === 'done') {
            try {
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/pipeline-output/combined_researcher_papers.csv`
              const res = await fetch(rawUrl, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/plain' },
              })
              if (res.ok) {
                const csvText = await res.text()
                const nameMap = parseNameMapping(csvText)
                if (nameMap.size > 0) {
                  researchersRef.current = researchersRef.current.map((r) => ({
                    ...r,
                    displayName: (r.scholarId && nameMap.get(r.scholarId)) || r.displayName,
                  }))
                  namesResolvedRef.current = true
                  console.debug(`[names] Resolved ${nameMap.size} researcher names from combined CSV`)
                }
              }
            } catch {
              // Will retry on next poll cycle
            }
          }
        }

        const overallProgress = computeOverallProgress(stages)

        // Determine overall status
        let overallStatus: OverallStatus = 'running'
        if (run.status === 'completed') {
          overallStatus = run.conclusion === 'success' ? 'done' : 'failed'
        } else if (run.status === 'queued') {
          overallStatus = 'queued'
        }

        // Adaptive polling: 8s when running, 15s when queued/waiting
        const newIntervalMs = (overallStatus === 'running') ? 5_000 : 15_000
        if (newIntervalMs !== currentIntervalMs) {
          currentIntervalMs = newIntervalMs
          schedulePoll()
        }

        const totalDurationMs = run.created_at
          ? (run.status === 'completed' && run.updated_at
              ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
              : Date.now() - new Date(run.created_at).getTime())
          : null

        setPipeline((prev) => ({
          ...prev,
          run: {
            id: run.id,
            status: run.status,
            conclusion: run.conclusion,
            html_url: run.html_url,
            created_at: run.created_at,
            updated_at: run.updated_at,
          },
          stages,
          researchers: researchersRef.current,
          artifacts,
          overallProgress,
          overallStatus,
          totalDurationMs,
          error: null,
          loading: false,
        }))

        // Auto-expand running stage, auto-collapse previous running stage
        const runningStage = stages.find((s) => s.status === 'running')
        const runningId = runningStage?.id ?? null
        if (runningId !== prevRunningStageRef.current) {
          setExpandedStages((prev) => {
            const next = new Set(prev)
            // Collapse the stage that just finished
            if (prevRunningStageRef.current && prevRunningStageRef.current !== runningId) {
              next.delete(prevRunningStageRef.current)
            }
            // Expand the new running stage
            if (runningId) next.add(runningId)
            return next
          })
          prevRunningStageRef.current = runningId
        }

        // Sync map history status
        const newMapStatus = run.status === 'completed'
          ? (run.conclusion === 'success' ? 'active' : 'failed')
          : 'generating'
        if (newMapStatus !== lastSyncedStatusRef.current) {
          lastSyncedStatusRef.current = newMapStatus
          updateMapStatus(owner, repo, newMapStatus as 'active' | 'failed' | 'generating')
        }

        // Stop polling when done — but only if all completed chunk logs have been resolved.
        // Otherwise keep polling so Fix 1b can retry fetching truncated/missing logs.
        const allLogsResolved = stages.every((s) =>
          !s.chunks || s.chunks.every((c) =>
            (c.status !== 'done' && c.status !== 'failed') || completedLogsFetchedRef.current.has(c.jobId)
          )
        )
        if (run.status === 'completed' && allLogsResolved && pollIntervalRef.current && !retryingRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        retryingRef.current = false
      } catch (err) {
        if (cancelled) return
        // Rate limit: back off and auto-recover
        if (err instanceof RateLimitError) {
          const backoffSec = Math.round(err.retryAfterMs / 1000)
          console.warn(`[poll] Rate limited, backing off ${backoffSec}s`)
          currentIntervalMs = Math.max(err.retryAfterMs, 60_000)
          schedulePoll()
          setPipeline((prev) => ({
            ...prev,
            loading: false,
            overallStatus: prev.overallStatus === 'loading' ? 'waiting' : prev.overallStatus,
            error: `GitHub rate limit reached — retrying in ${Math.ceil(backoffSec / 60)}m`,
          }))
          return
        }
        setPipeline((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Polling failed',
          loading: false,
        }))
      }
    }

    poll()
    schedulePoll()

    return () => {
      cancelled = true
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, owner, repo, updateMapStatus, pollGeneration])

  // Tab title + favicon updates
  useEffect(() => {
    // Save originals on first mount
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (link && !originalFaviconRef.current) {
      originalFaviconRef.current = link.href
    }

    const basePath = import.meta.env.BASE_URL || '/'

    if (pipeline.overallStatus === 'waiting') {
      document.title = `Waiting — ${owner}/${repo}`
      if (link) link.href = `${basePath}favicon-spinner.svg`
    } else if (pipeline.overallStatus === 'running' || pipeline.overallStatus === 'queued') {
      document.title = `${pipeline.overallProgress}% — Generating Map`
      if (link) link.href = `${basePath}favicon-spinner.svg`
    } else if (pipeline.overallStatus === 'done') {
      document.title = `✓ Map Ready — ${owner}/${repo}`
      if (link) link.href = `${basePath}favicon-success.svg`
    } else if (pipeline.overallStatus === 'failed') {
      document.title = `✗ Pipeline Failed — ${owner}/${repo}`
      if (link) link.href = `${basePath}favicon-error.svg`
    }

    return () => {
      document.title = originalTitleRef.current
      if (link && originalFaviconRef.current) {
        link.href = originalFaviconRef.current
      }
    }
  }, [pipeline.overallStatus, pipeline.overallProgress, owner, repo])

  // Retry actions — resume polling gracefully instead of reloading
  const retryWorkflow = useCallback(async () => {
    if (!token) return
    try {
      retryingRef.current = true
      await apiRerunWorkflow(token, owner, repo)
      lastSyncedStatusRef.current = null
      prevRunningStageRef.current = null
      logsCacheRef.current.clear()
      completedLogsFetchedRef.current.clear()
      lastRunningLogsFetchRef.current = 0
      namesResolvedRef.current = false
      setPipeline((prev) => ({ ...prev, overallStatus: 'waiting', overallProgress: 0, stages: [], error: null }))
      setPollGeneration((g) => g + 1)
    } catch (err) {
      setPipeline((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Retry failed' }))
    }
  }, [token, owner, repo])

  const retryFailedJobs = useCallback(async () => {
    if (!token || !pipeline.run) return
    try {
      retryingRef.current = true
      await apiRerunFailedJobs(token, owner, repo, pipeline.run.id)
      lastSyncedStatusRef.current = null
      logsCacheRef.current.clear()
      completedLogsFetchedRef.current.clear()
      lastRunningLogsFetchRef.current = 0
      setPipeline((prev) => ({ ...prev, overallStatus: 'running', error: null }))
      setPollGeneration((g) => g + 1)
    } catch (err) {
      setPipeline((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Retry failed' }))
    }
  }, [token, owner, repo, pipeline.run])

  return {
    pipeline,
    expandedStages,
    expandedChunks,
    toggleStage,
    toggleChunk,
    expandAll,
    collapseAll,
    retryWorkflow,
    retryFailedJobs,
  }
}
