import { GITHUB_CLIENT_ID, OAUTH_WORKER_URL, OAUTH_SCOPES, OAUTH_REDIRECT_URI } from './config'

export function isOAuthConfigured(): boolean {
  return !!GITHUB_CLIENT_ID && !!OAUTH_WORKER_URL
}

export function redirectToGitHub() {
  if (!isOAuthConfigured()) {
    throw new Error('GitHub OAuth is not configured. Set VITE_GITHUB_CLIENT_ID and VITE_OAUTH_WORKER_URL in .env')
  }

  const state = crypto.randomUUID()
  sessionStorage.setItem('oauth_state', state)

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: OAUTH_SCOPES,
    state,
  })

  window.location.href = `https://github.com/login/oauth/authorize?${params}`
}

export function extractOAuthCallback(): { code: string } | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const savedState = sessionStorage.getItem('oauth_state')

  if (!code || !state) return null
  if (state !== savedState) {
    console.error('OAuth state mismatch')
    return null
  }

  sessionStorage.removeItem('oauth_state')
  return { code }
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch(`${OAUTH_WORKER_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  const { access_token } = await res.json()
  return access_token
}

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Failed to fetch GitHub user')
  return res.json()
}
