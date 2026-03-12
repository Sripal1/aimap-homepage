export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string
export const OAUTH_WORKER_URL = import.meta.env.VITE_OAUTH_WORKER_URL as string

export const TEMPLATE_OWNER = 'Sripal1'
export const TEMPLATE_REPO = 'ai-map'
export const WORKFLOW_FILE = 'generate-map.yml'
export const OAUTH_SCOPES = 'repo workflow gist'
export const OAUTH_REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}create`
