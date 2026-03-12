import { TEMPLATE_OWNER, TEMPLATE_REPO, WORKFLOW_FILE } from './config'
import sodium from 'libsodium-wrappers-sumo'

async function ghFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
    const retryAfter = res.headers.get('retry-after')
    const resetHeader = res.headers.get('x-ratelimit-reset')
    let waitMs = 60_000
    if (retryAfter) {
      waitMs = parseInt(retryAfter, 10) * 1000
    } else if (resetHeader) {
      waitMs = Math.max((parseInt(resetHeader, 10) * 1000) - Date.now(), 30_000)
    }
    throw new RateLimitError(waitMs)
  }

  if (!res.ok) {
    const body = await res.text()
    // Also catch 403 rate limit messages that don't have the header
    if (res.status === 403 && body.includes('rate limit')) {
      throw new RateLimitError(60_000)
    }
    throw new Error(`GitHub API error ${res.status}: ${body}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export class RateLimitError extends Error {
  retryAfterMs: number
  constructor(retryAfterMs: number) {
    super(`Rate limited — retry after ${Math.round(retryAfterMs / 1000)}s`)
    this.retryAfterMs = retryAfterMs
  }
}

export async function getRepo(token: string, owner: string, repo: string) {
  return ghFetch(token, `/repos/${owner}/${repo}`)
}

export async function createRepoFromTemplate(token: string, repoName: string) {
  const repo = await ghFetch(token, `/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/generate`, {
    method: 'POST',
    body: JSON.stringify({
      name: repoName,
      include_all_branches: false,
      private: false,
    }),
  })

  // Template duplication is async — wait until the repo has content
  // before pushing files, otherwise our commits get overwritten.
  const owner = repo.owner.login
  const name = repo.name
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    try {
      const contents = await ghFetch(token, `/repos/${owner}/${name}/contents/`)
      if (Array.isArray(contents) && contents.length > 0) break
    } catch {
      // Repo not ready yet
    }
  }

  return repo
}

export async function pushFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
) {
  const encoded = btoa(unescape(encodeURIComponent(content)))

  // Check if file exists to get its sha
  let sha: string | undefined
  try {
    const existing = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`)
    sha = existing?.sha
  } catch {
    // File doesn't exist yet, that's fine
  }

  return ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: encoded, sha }),
  })
}

async function getRepoPublicKey(token: string, owner: string, repo: string) {
  return ghFetch(token, `/repos/${owner}/${repo}/actions/secrets/public-key`)
}

export async function storeRepoSecret(
  token: string,
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string,
) {
  await sodium.ready

  const { key, key_id } = await getRepoPublicKey(token, owner, repo)
  const keyBytes = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
  const messageBytes = sodium.from_string(secretValue)
  const encrypted = sodium.crypto_box_seal(messageBytes, keyBytes)
  const encryptedB64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL)

  return ghFetch(token, `/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    body: JSON.stringify({ encrypted_value: encryptedB64, key_id }),
  })
}

export async function triggerWorkflow(token: string, owner: string, repo: string) {
  // Retry because GitHub needs time to index workflows after repo creation from template
  const maxAttempts = 5
  const delayMs = 3000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ghFetch(token, `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
        method: 'POST',
        body: JSON.stringify({ ref: 'main' }),
      })
    } catch (err) {
      if (attempt === maxAttempts) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

export async function getLatestWorkflowRun(token: string, owner: string, repo: string) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`)
  return data?.workflow_runs?.[0] ?? null
}

export async function getWorkflowJobs(token: string, owner: string, repo: string, runId: number) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100`)
  return data?.jobs ?? []
}

export async function getRepoFileContent(token: string, owner: string, repo: string, path: string): Promise<string> {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`)
  // atob() produces a Latin-1 string, not UTF-8 — decode properly via Uint8Array
  const binary = atob(data.content)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export async function getWorkflowArtifacts(token: string, owner: string, repo: string, runId: number) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`)
  return data?.artifacts ?? []
}

export async function getJobLogs(token: string, owner: string, repo: string, jobId: number): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`
    console.debug(`[getJobLogs] Fetching logs for job ${jobId}...`)
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    console.debug(`[getJobLogs] job=${jobId} status=${res.status} redirected=${res.redirected} url=${res.url}`)
    if (res.ok) {
      const text = await res.text()
      console.debug(`[getJobLogs] job=${jobId} got ${text.length} chars`)
      return text
    }
    console.warn(`[getJobLogs] job=${jobId} not ok: ${res.status}`)
    return null
  } catch (err) {
    console.warn(`[getJobLogs] job=${jobId} error:`, err)
    return null
  }
}

export async function rerunWorkflow(token: string, owner: string, repo: string) {
  return ghFetch(token, `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  })
}

export async function rerunFailedJobs(token: string, owner: string, repo: string, runId: number) {
  return ghFetch(token, `/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`, {
    method: 'POST',
  })
}

export async function downloadArtifact(token: string, owner: string, repo: string, artifactId: number, filename: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new Error(`Failed to download artifact: ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function enableGitHubPages(token: string, owner: string, repo: string) {
  return ghFetch(token, `/repos/${owner}/${repo}/pages`, {
    method: 'POST',
    body: JSON.stringify({
      build_type: 'workflow',
      source: { branch: 'gh-pages', path: '/' },
    }),
  })
}
