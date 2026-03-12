import type { MapRecord } from '@/types'

const GIST_FILENAME = 'aimap-history.json'
const GIST_DESCRIPTION = 'AI Map - Map History (auto-synced)'

interface GistFile {
  filename: string
  content?: string
}

interface GistSummary {
  id: string
  files: Record<string, GistFile>
}

async function gistFetch(token: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`Gist API ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export async function fetchGistHistory(
  token: string,
): Promise<{ id: string; maps: MapRecord[] } | null> {
  try {
    const gists: GistSummary[] = await gistFetch(
      token,
      'https://api.github.com/gists?per_page=100',
    )
    const match = gists.find((g) => g.files[GIST_FILENAME])
    if (!match) return null

    // List endpoint truncates content — fetch the full gist
    const full = await gistFetch(token, `https://api.github.com/gists/${match.id}`)
    const content = full.files[GIST_FILENAME]?.content
    if (!content) return null

    return { id: match.id, maps: JSON.parse(content) as MapRecord[] }
  } catch {
    return null
  }
}

export async function saveGistHistory(
  token: string,
  gistId: string | null,
  maps: MapRecord[],
): Promise<string | null> {
  const content = JSON.stringify(maps, null, 2)

  try {
    if (gistId) {
      await gistFetch(token, `https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          files: { [GIST_FILENAME]: { content } },
        }),
      })
      return gistId
    }

    const created = await gistFetch(token, 'https://api.github.com/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: { [GIST_FILENAME]: { content } },
      }),
    })
    return created.id
  } catch {
    return null
  }
}

export function mergeMaps(local: MapRecord[], remote: MapRecord[]): MapRecord[] {
  const merged = new Map<string, MapRecord>()

  for (const m of remote) {
    merged.set(m.id, m)
  }

  for (const m of local) {
    const existing = merged.get(m.id)
    if (!existing || new Date(m.updatedAt) >= new Date(existing.updatedAt)) {
      merged.set(m.id, m)
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
