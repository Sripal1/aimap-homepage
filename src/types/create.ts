export type LLMProvider = 'gemini' | 'openai' | 'anthropic'

export type ResearcherMethod = 'csv' | 'scholar-urls'

export interface DepartmentData {
  universityName: string
  departmentName: string
  colorTheme: string
}

export interface ResearchersData {
  method: ResearcherMethod
  csvFile: File | null
  scholarUrls: string
  detectedCount: number
}

export interface AISummariesData {
  provider: LLMProvider
  apiKey: string
}

export interface GenerationData {
  repoName: string
}

export interface CreateFormData {
  department: DepartmentData
  researchers: ResearchersData
  aiSummaries: AISummariesData
  generation: GenerationData
}

export interface ColorSwatch {
  name: string
  hex: string
}

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

export interface GenerationProgress {
  status: 'idle' | 'running' | 'done' | 'error'
  step: string | null
  completedStep: number
  repoUrl: string | null
  owner: string | null
  repo: string | null
  error: string | null
}

export interface WorkflowJob {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  html_url: string
}

export const COLOR_PRESETS: ColorSwatch[] = [
  { name: 'Teal', hex: '#2a7a72' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Slate', hex: '#475569' },
]
