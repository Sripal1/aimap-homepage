import { Link } from 'react-router-dom'
import { ExternalLink, Archive, RotateCcw, Trash2, Eye, Activity } from 'lucide-react'
import type { MapRecord } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

interface MapCardProps {
  map: MapRecord
  onArchive: (owner: string, repo: string) => void
  onRestore: (owner: string, repo: string) => void
  onDelete: (owner: string, repo: string) => void
}

const STATUS_BADGE: Record<MapRecord['status'], { label: string; className: string }> = {
  generating: { label: 'Generating', className: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  deleted: { label: 'Archived', className: 'bg-stone-100 text-stone-500' },
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

export default function MapCard({ map, onArchive, onRestore, onDelete }: MapCardProps) {
  const badge = STATUS_BADGE[map.status]
  const providerLabel = PROVIDER_LABELS[map.config.llmProvider] ?? map.config.llmProvider

  return (
    <div className="border border-stone-200 rounded-lg p-5 bg-white hover:border-stone-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-mono text-stone-500 truncate">{map.owner}/{map.repo}</p>
          <h3 className="mt-1 font-semibold text-stone-900 truncate">{map.config.universityName}</h3>
          <p className="text-sm text-stone-600 truncate">{map.config.departmentName}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-stone-400">
        <span
          className="inline-block w-3 h-3 rounded-full border border-stone-200"
          style={{ backgroundColor: map.config.colorTheme }}
        />
        <span>{map.config.researcherCount} researchers</span>
        <span>{providerLabel}</span>
      </div>

      <p className="mt-2 text-xs text-stone-400">{formatRelativeTime(map.updatedAt)}</p>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {map.status === 'active' && (
          <>
            <a
              href={map.pagesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-brand-teal text-white rounded-md hover:bg-brand-teal-dark transition-colors"
            >
              <Eye className="w-3 h-3" />
              View Map
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => onArchive(map.owner, map.repo)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-stone-200 text-stone-500 rounded-md hover:bg-stone-50 transition-colors"
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </>
        )}

        {map.status === 'generating' && (
          <>
            <Link
              to={`/progress/${map.owner}/${map.repo}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
            >
              <Activity className="w-3 h-3" />
              View Progress
            </Link>
            <button
              onClick={() => onArchive(map.owner, map.repo)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-stone-200 text-stone-500 rounded-md hover:bg-stone-50 transition-colors"
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </>
        )}

        {map.status === 'failed' && (
          <>
            <a
              href={map.actionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              View Actions Log
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => onArchive(map.owner, map.repo)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-stone-200 text-stone-500 rounded-md hover:bg-stone-50 transition-colors"
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </>
        )}

        {map.status === 'deleted' && (
          <>
            <button
              onClick={() => onRestore(map.owner, map.repo)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-stone-200 text-stone-600 rounded-md hover:bg-stone-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restore
            </button>
            <button
              onClick={() => onDelete(map.owner, map.repo)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete Permanently
            </button>
          </>
        )}
      </div>
    </div>
  )
}
