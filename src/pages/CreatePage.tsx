import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Loader2, ArrowLeft, ArrowRight, Github } from 'lucide-react'
import type { CreateFormData } from '@/types'
import type { StepErrors } from '@/lib/validation'
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
} from '@/lib/validation'
import { useAuth } from '@/contexts/AuthContext'
import { useMapHistory } from '@/contexts/MapHistoryContext'
import { useGeneration } from '@/hooks/useGeneration'
import { useWizardState } from '@/hooks/useWizardState'
import { isOAuthConfigured } from '@/lib/oauth'
import StepIndicator from '@/components/ui/StepIndicator'
import StepDepartment from '@/components/create/StepDepartment'
import StepResearchers from '@/components/create/StepResearchers'
import StepAISummaries from '@/components/create/StepAISummaries'
import StepReviewGenerate from '@/components/create/StepReviewGenerate'

const STEPS = ['Department', 'Researchers', 'AI Summaries', 'Review']

const INITIAL_DATA: CreateFormData = {
  department: {
    universityName: '',
    departmentName: '',
    colorTheme: '#2a7a72',
  },
  researchers: {
    method: 'scholar-urls',
    csvFile: null,
    scholarUrls: '',
    detectedCount: 0,
  },
  aiSummaries: {
    provider: 'gemini',
    apiKey: '',
  },
  generation: {
    repoName: '',
  },
}

export default function CreatePage() {
  const navigate = useNavigate()
  const { token, user, login, loading: authLoading, error: authError } = useAuth()
  const { progress, generate, retry } = useGeneration(token)
  const { addMap } = useMapHistory()

  const { data, step, updateSlice, updateStep, clearWizard } = useWizardState(INITIAL_DATA)
  const [errors, setErrors] = useState<StepErrors>({})

  const validate = useCallback((): StepErrors => {
    switch (step) {
      case 0:
        return validateStep1(data.department)
      case 1:
        return validateStep2(data.researchers)
      case 2:
        return validateStep3(data.aiSummaries)
      case 3:
        return validateStep4(data.generation)
      default:
        return {}
    }
  }, [step, data])

  const handleNext = useCallback(async () => {
    const stepErrors = validate()
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return

    if (step < 3) {
      updateStep(step + 1)
    } else {
      const result = await generate(data)
      if (result) {
        const now = new Date().toISOString()
        addMap({
          id: `${result.owner}/${result.repo}`,
          owner: result.owner,
          repo: result.repo,
          status: 'generating',
          createdAt: now,
          updatedAt: now,
          config: {
            universityName: data.department.universityName,
            departmentName: data.department.departmentName,
            colorTheme: data.department.colorTheme,
            researcherCount: data.researchers.detectedCount,
            llmProvider: data.aiSummaries.provider,
          },
          pagesUrl: `https://${result.owner}.github.io/${result.repo}/`,
          repoUrl: `https://github.com/${result.owner}/${result.repo}`,
          actionsUrl: `https://github.com/${result.owner}/${result.repo}/actions`,
        })
        clearWizard()
        navigate(`/progress/${result.owner}/${result.repo}`)
      }
    }
  }, [step, validate, generate, data, navigate, addMap, clearWizard, updateStep])

  const handleBack = useCallback(() => {
    setErrors({})
    updateStep(Math.max(0, step - 1))
  }, [step, updateStep])

  const oauthReady = isOAuthConfigured()

  // Auth gate
  if (!authLoading && !user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center py-12">
          <Github className="h-12 w-12 text-stone-400" />
          <h2 className="mt-4 text-2xl font-bold text-stone-900">Sign in to Create a Map</h2>
          <p className="mt-2 text-stone-600 max-w-md">
            Connect your GitHub account so we can create a repository and set up the generation workflow for you.
          </p>
          {authError && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-md">
              {authError}
            </p>
          )}
          {oauthReady ? (
            <button
              onClick={login}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-md hover:bg-stone-800 transition-colors"
            >
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </button>
          ) : (
            <p className="mt-6 text-sm text-stone-400">
              GitHub OAuth is not configured. Set <code className="bg-stone-100 px-1 rounded">VITE_GITHUB_CLIENT_ID</code> and <code className="bg-stone-100 px-1 rounded">VITE_OAUTH_WORKER_URL</code> in your <code className="bg-stone-100 px-1 rounded">.env</code> file.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Generation in progress
  if (progress.status === 'running') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        <p className="text-stone-600 font-medium">{progress.step}</p>
      </div>
    )
  }

  // Generation error
  if (progress.status === 'error') {
    const failedStepLabel = progress.completedStep >= 0
      ? `Failed after step ${progress.completedStep + 1}: ${progress.step}`
      : `Failed at: ${progress.step}`

    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <p className="text-red-600 font-medium">{failedStepLabel}</p>
        <p className="text-sm text-stone-500">{progress.error}</p>
        {progress.repoUrl && (
          <a
            href={progress.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-teal hover:underline"
          >
            View partially created repository
          </a>
        )}
        <button
          onClick={async () => {
            const result = await retry(data)
            if (result) navigate(`/progress/${result.owner}/${result.repo}`)
          }}
          className="mt-2 px-5 py-2.5 border border-stone-300 text-stone-700 text-sm font-medium rounded-md hover:bg-stone-50 transition-colors"
        >
          Retry from step {progress.completedStep + 2}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-stone-900">Create a Map</h1>
      <p className="mt-2 text-stone-600">
        Generate a research map for your department in a few steps.
      </p>

      <div className="mt-8">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <div className="mt-10">
        {step === 0 && (
          <StepDepartment
            data={data.department}
            errors={errors}
            onChange={(u) => updateSlice('department', u)}
          />
        )}
        {step === 1 && (
          <StepResearchers
            data={data.researchers}
            errors={errors}
            onChange={(u) => updateSlice('researchers', u)}
          />
        )}
        {step === 2 && (
          <StepAISummaries
            data={data.aiSummaries}
            errors={errors}
            onChange={(u) => updateSlice('aiSummaries', u)}
          />
        )}
        {step === 3 && (
          <StepReviewGenerate
            data={data}
            errors={errors}
            onChange={(repoName) => updateSlice('generation', { repoName })}
          />
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 text-sm font-medium rounded-md hover:border-stone-400 hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-medium rounded-md hover:bg-brand-teal-dark transition-colors"
        >
          {step === 3 ? (
            <>
              <Rocket className="h-4 w-4" />
              Generate My Map
            </>
          ) : (
            <>
              Next Step
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
