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

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${body}`)
  }

  if (res.status === 204) return null
  return res.json()
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
  const data = await ghFetch(token, `/repos/${owner}/${repo}/actions/runs?per_page=1`)
  return data?.workflow_runs?.[0] ?? null
}

export async function getWorkflowJobs(token: string, owner: string, repo: string, runId: number) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/actions/runs/${runId}/jobs`)
  return data?.jobs ?? []
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
