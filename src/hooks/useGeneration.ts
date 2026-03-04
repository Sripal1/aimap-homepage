import { useState, useCallback, useRef } from 'react'
import type { CreateFormData, GenerationProgress } from '@/types'
import { createRepoFromTemplate, getRepo, pushFile, storeRepoSecret, triggerWorkflow, enableGitHubPages } from '@/lib/github'
import { buildConfigYaml, buildResearchersCsv } from '@/lib/generate-config'

const LLM_SECRET_NAME: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

const STEP_LABELS = [
  'Creating repository (this may take a moment)...',
  'Pushing configuration...',
  'Pushing researchers data...',
  'Storing API key...',
  'Enabling GitHub Pages...',
  'Triggering workflow...',
]

const INITIAL_PROGRESS: GenerationProgress = {
  status: 'idle',
  step: null,
  completedStep: -1,
  repoUrl: null,
  owner: null,
  repo: null,
  error: null,
}

export function useGeneration(token: string | null) {
  const [progress, setProgress] = useState<GenerationProgress>(INITIAL_PROGRESS)
  const repoInfoRef = useRef<{ owner: string; repo: string; repoUrl: string } | null>(null)

  const runSteps = useCallback(
    async (data: CreateFormData, startFrom: number) => {
      if (!token) {
        setProgress((p) => ({ ...p, status: 'error', error: 'Not authenticated' }))
        return null
      }

      let owner = repoInfoRef.current?.owner ?? ''
      let repo = repoInfoRef.current?.repo ?? ''
      let repoUrl = repoInfoRef.current?.repoUrl ?? ''

      const steps = [
        // Step 0: Create repo from template
        async () => {
          if (owner && repo) {
            // Retry: check if repo already exists
            try {
              const existing = await getRepo(token, owner, repo)
              repoUrl = existing.html_url
              return
            } catch {
              // Repo doesn't exist, create it
            }
          }
          const repoResult = await createRepoFromTemplate(token, data.generation.repoName)
          owner = repoResult.owner.login
          repo = repoResult.name
          repoUrl = repoResult.html_url
          repoInfoRef.current = { owner, repo, repoUrl }
          setProgress((p) => ({ ...p, repoUrl, owner, repo }))
        },
        // Step 1: Push config file
        async () => {
          const configYaml = buildConfigYaml(data)
          await pushFile(token, owner, repo, 'researchmap.config.yaml', configYaml, 'Add research map configuration')
        },
        // Step 2: Push researchers file
        async () => {
          let researchersCsv: string
          if (data.researchers.method === 'csv' && data.researchers.csvFile) {
            researchersCsv = await data.researchers.csvFile.text()
          } else {
            researchersCsv = buildResearchersCsv(data)
          }
          await pushFile(token, owner, repo, 'researchers.csv', researchersCsv, 'Add researchers data')
        },
        // Step 3: Store LLM API key as secret
        async () => {
          const secretName = LLM_SECRET_NAME[data.aiSummaries.provider]
          await storeRepoSecret(token, owner, repo, secretName, data.aiSummaries.apiKey)
        },
        // Step 4: Enable GitHub Pages
        async () => {
          try {
            await enableGitHubPages(token, owner, repo)
          } catch {
            // Pages may already be enabled or not yet available — non-fatal
          }
        },
        // Step 5: Trigger workflow
        async () => {
          await triggerWorkflow(token, owner, repo)
        },
      ]

      try {
        for (let i = startFrom; i < steps.length; i++) {
          setProgress((p) => ({ ...p, status: 'running', step: STEP_LABELS[i], error: null }))
          await steps[i]()
          setProgress((p) => ({ ...p, completedStep: i }))
        }

        setProgress((p) => ({ ...p, status: 'done', step: 'Complete!' }))
        return { owner, repo }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setProgress((p) => ({ ...p, status: 'error', error: message }))
        return null
      }
    },
    [token],
  )

  const generate = useCallback(
    async (data: CreateFormData) => {
      repoInfoRef.current = null
      setProgress(INITIAL_PROGRESS)
      return runSteps(data, 0)
    },
    [runSteps],
  )

  const retry = useCallback(
    async (data: CreateFormData) => {
      const startFrom = progress.completedStep + 1
      return runSteps(data, startFrom)
    },
    [runSteps, progress.completedStep],
  )

  return { progress, generate, retry }
}
