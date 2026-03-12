import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { MapRecord, MapStatus } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { getStoredJSON, setStoredJSON } from '@/lib/storage'
import { fetchGistHistory, saveGistHistory, mergeMaps } from '@/lib/gist-sync'

const STORAGE_KEY = 'maps'
const SYNC_DEBOUNCE_MS = 2000

interface MapHistoryState {
  maps: MapRecord[]
  addMap: (record: MapRecord) => void
  updateMapStatus: (owner: string, repo: string, status: MapStatus) => void
  softDeleteMap: (owner: string, repo: string) => void
  restoreMap: (owner: string, repo: string) => void
  permanentlyDeleteMap: (owner: string, repo: string) => void
}

const noop = () => {}

const MapHistoryContext = createContext<MapHistoryState>({
  maps: [],
  addMap: noop,
  updateMapStatus: noop,
  softDeleteMap: noop,
  restoreMap: noop,
  permanentlyDeleteMap: noop,
})

export function MapHistoryProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const [maps, setMaps] = useState<MapRecord[]>([])
  const gistIdRef = useRef<string | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from localStorage, then merge with gist in background
  useEffect(() => {
    if (!user) {
      setMaps([])
      gistIdRef.current = null
      return
    }

    const local = getStoredJSON<MapRecord[]>(user.login, STORAGE_KEY) ?? []
    setMaps(local)

    if (!token) return

    let cancelled = false

    fetchGistHistory(token).then((result) => {
      if (cancelled) return

      if (result) {
        gistIdRef.current = result.id
        const merged = mergeMaps(local, result.maps)
        setMaps(merged)
        setStoredJSON(user.login, STORAGE_KEY, merged)

        // Push merged result back to gist if it changed
        if (JSON.stringify(merged) !== JSON.stringify(result.maps)) {
          saveGistHistory(token, result.id, merged)
        }
      } else {
        // No gist yet — create one if we have local data
        if (local.length > 0) {
          saveGistHistory(token, null, local).then((id) => {
            if (id && !cancelled) gistIdRef.current = id
          })
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, token])

  // Clean up pending sync on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [])

  const persist = useCallback(
    (updated: MapRecord[]) => {
      if (!user) return
      setStoredJSON(user.login, STORAGE_KEY, updated)

      // Debounced gist sync
      if (token) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
        syncTimerRef.current = setTimeout(() => {
          saveGistHistory(token, gistIdRef.current, updated).then((id) => {
            if (id) gistIdRef.current = id
          })
        }, SYNC_DEBOUNCE_MS)
      }
    },
    [user, token],
  )

  const addMap = useCallback(
    (record: MapRecord) => {
      setMaps((prev) => {
        const filtered = prev.filter((m) => m.id !== record.id)
        const updated = [record, ...filtered]
        persist(updated)
        return updated
      })
    },
    [persist],
  )

  const updateMapStatus = useCallback(
    (owner: string, repo: string, status: MapStatus) => {
      setMaps((prev) => {
        const updated = prev.map((m) =>
          m.owner === owner && m.repo === repo
            ? { ...m, status, updatedAt: new Date().toISOString() }
            : m,
        )
        persist(updated)
        return updated
      })
    },
    [persist],
  )

  const softDeleteMap = useCallback(
    (owner: string, repo: string) => {
      updateMapStatus(owner, repo, 'deleted')
    },
    [updateMapStatus],
  )

  const restoreMap = useCallback(
    (owner: string, repo: string) => {
      updateMapStatus(owner, repo, 'active')
    },
    [updateMapStatus],
  )

  const permanentlyDeleteMap = useCallback(
    (owner: string, repo: string) => {
      setMaps((prev) => {
        const updated = prev.filter((m) => !(m.owner === owner && m.repo === repo))
        persist(updated)
        return updated
      })
    },
    [persist],
  )

  return (
    <MapHistoryContext.Provider
      value={{ maps, addMap, updateMapStatus, softDeleteMap, restoreMap, permanentlyDeleteMap }}
    >
      {children}
    </MapHistoryContext.Provider>
  )
}

export function useMapHistory() {
  return useContext(MapHistoryContext)
}
