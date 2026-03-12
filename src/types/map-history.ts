export type MapStatus = 'generating' | 'active' | 'failed' | 'deleted'

export interface MapConfigSnapshot {
  universityName: string
  departmentName: string
  colorTheme: string
  researcherCount: number
  llmProvider: string
}

export interface MapRecord {
  id: string              // `${owner}/${repo}`
  owner: string
  repo: string
  status: MapStatus
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
  config: MapConfigSnapshot
  pagesUrl: string
  repoUrl: string
  actionsUrl: string
}
