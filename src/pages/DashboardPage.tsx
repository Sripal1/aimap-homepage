import { Github } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMapHistory } from '@/contexts/MapHistoryContext'
import { isOAuthConfigured } from '@/lib/oauth'
import MapCard from '@/components/dashboard/MapCard'
import EmptyState from '@/components/dashboard/EmptyState'
import type { MapRecord } from '@/types'

type StatusGroup = {
  label: string
  statuses: MapRecord['status'][]
}

const GROUPS: StatusGroup[] = [
  { label: 'In Progress', statuses: ['generating'] },
  { label: 'Active', statuses: ['active'] },
  { label: 'Failed', statuses: ['failed'] },
  { label: 'Archived', statuses: ['deleted'] },
]

function sortByUpdated(a: MapRecord, b: MapRecord): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

export default function DashboardPage() {
  const { user, login, loading: authLoading } = useAuth()
  const { maps, softDeleteMap, restoreMap, permanentlyDeleteMap } = useMapHistory()

  if (!authLoading && !user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center py-12">
          <Github className="h-12 w-12 text-stone-400" />
          <h2 className="mt-4 text-2xl font-bold text-stone-900">Sign in to View Your Maps</h2>
          <p className="mt-2 text-stone-600 max-w-md">
            Connect your GitHub account to manage your research maps.
          </p>
          {isOAuthConfigured() && (
            <button
              onClick={login}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-md hover:bg-stone-800 transition-colors"
            >
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    )
  }

  if (maps.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-stone-900">My Maps</h1>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-stone-900">My Maps</h1>
      <p className="mt-2 text-stone-600">
        {maps.filter((m) => m.status !== 'deleted').length} map{maps.filter((m) => m.status !== 'deleted').length === 1 ? '' : 's'}
      </p>

      <div className="mt-10 space-y-10">
        {GROUPS.map((group) => {
          const groupMaps = maps
            .filter((m) => group.statuses.includes(m.status))
            .sort(sortByUpdated)

          if (groupMaps.length === 0) return null

          return (
            <section key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-4">
                {group.label} ({groupMaps.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupMaps.map((m) => (
                  <MapCard
                    key={m.id}
                    map={m}
                    onArchive={softDeleteMap}
                    onRestore={restoreMap}
                    onDelete={permanentlyDeleteMap}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
