import { useState } from 'react'
import { cn } from '@/lib/utils'
import { STAGE_HSL_MAP } from './stage-colors'
import type { ResearcherInfo, ResearcherLogStatus, StageStatus, StageId } from '@/types'

interface Props {
  researchers: ResearcherInfo[]
  researcherStatuses?: Map<string, ResearcherLogStatus>
  stageStatus?: StageStatus
  stageId?: StageId
  compact?: boolean
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function ScholarPhoto({
  scholarId,
  displayName,
  stageId,
}: {
  scholarId?: string
  displayName: string
  stageId?: StageId
}) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>(scholarId ? 'loading' : 'error')
  const hsl = stageId ? STAGE_HSL_MAP[stageId] : '176, 47%, 26%'
  const initials = getInitials(displayName)

  if (!scholarId || state === 'error') {
    return (
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white/90 flex-shrink-0"
        style={{ backgroundColor: `hsla(${hsl}, 0.55)` }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      {state === 'loading' && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ backgroundColor: `hsla(${hsl}, 0.08)` }}
        />
      )}
      <img
        src={`https://scholar.googleusercontent.com/citations?view_op=medium_photo&user=${scholarId}`}
        alt={displayName}
        loading="lazy"
        className={cn(
          'w-9 h-9 rounded-full object-cover',
          state === 'loading' && 'opacity-0',
        )}
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
      />
    </div>
  )
}

type StatusGroup = 'active' | 'queued' | 'done' | 'failed'

function getStatusGroup(entry: ResearcherLogStatus | undefined, stageStatus?: StageStatus): StatusGroup {
  if (!entry) {
    if (stageStatus === 'done') return 'done'
    if (stageStatus === 'failed') return 'failed'
    return 'queued'
  }
  switch (entry.status) {
    case 'scraping':
    case 'retrying':
      return 'active'
    case 'success':
      return 'done'
    case 'exhausted':
    case 'timeout':
      return 'failed'
    case 'pending':
    default:
      return 'queued'
  }
}

function statusLabel(entry: ResearcherLogStatus | undefined, stageStatus?: StageStatus): string {
  if (!entry) {
    if (stageStatus === 'done') return 'Complete'
    if (stageStatus === 'failed') return 'Failed'
    return 'Queued'
  }
  switch (entry.status) {
    case 'scraping':  return 'Processing'
    case 'success':   return 'Complete'
    case 'retrying':  return entry.attempts > 1 ? `Retry #${entry.attempts}` : 'Retrying'
    case 'exhausted': return entry.attempts > 1 ? `Failed \u00b7 ${entry.attempts} attempts` : 'Failed'
    case 'timeout':   return 'Timed out'
    case 'pending':
    default:          return 'Queued'
  }
}

function StatusDot({ group, hsl }: { group: StatusGroup; hsl: string }) {
  if (group === 'active') {
    return (
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        <span
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ backgroundColor: `hsl(${hsl})` }}
        />
        <span
          className="relative h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: `hsl(${hsl})` }}
        />
      </span>
    )
  }
  if (group === 'done') {
    return (
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: `hsl(${hsl})` }}
      />
    )
  }
  if (group === 'failed') {
    return <span className="h-1.5 w-1.5 rounded-full bg-red-400/70 flex-shrink-0" />
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-stone-200 flex-shrink-0" />
}

const GROUP_ORDER: StatusGroup[] = ['active', 'failed', 'done', 'queued']
const GROUP_LABELS: Record<StatusGroup, string> = {
  active: 'In Progress',
  queued: 'In Queue',
  done: 'Completed',
  failed: 'Issues',
}

const STATUS_SORT: Record<string, number> = {
  scraping: 0,
  retrying: 1,
  exhausted: 2,
  timeout: 3,
  success: 4,
  pending: 5,
}

export default function ResearcherList({ researchers, researcherStatuses, stageStatus, stageId, compact }: Props) {
  if (researchers.length === 0) return null

  const hsl = stageId ? STAGE_HSL_MAP[stageId] : '176, 47%, 26%'

  const groups = new Map<StatusGroup, ResearcherInfo[]>()
  for (const g of GROUP_ORDER) groups.set(g, [])

  for (const r of researchers) {
    const entry = researcherStatuses?.get(r.name)
    const group = getStatusGroup(entry, stageStatus)
    groups.get(group)!.push(r)
  }

  for (const [, list] of groups) {
    list.sort((a, b) => {
      const entryA = researcherStatuses?.get(a.name)
      const entryB = researcherStatuses?.get(b.name)
      const orderA = entryA ? (STATUS_SORT[entryA.status] ?? 5) : 5
      const orderB = entryB ? (STATUS_SORT[entryB.status] ?? 5) : 5
      return orderA - orderB
    })
  }

  const visibleGroups = GROUP_ORDER.filter((g) => groups.get(g)!.length > 0)
  const showHeaders = visibleGroups.length > 1

  let globalIndex = 0

  return (
    <div className="space-y-5">
      {visibleGroups.map((groupId) => {
        const list = groups.get(groupId)!
        return (
          <div key={groupId}>
            {showHeaders && (
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                  {GROUP_LABELS[groupId]}
                </span>
                <span className="text-[11px] text-stone-300 tabular-nums">{list.length}</span>
                <div className="flex-1 h-px bg-stone-100/80" />
              </div>
            )}
            <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'}>
              {list.map((r) => {
                const idx = globalIndex++
                const entry = researcherStatuses?.get(r.name)
                const group = getStatusGroup(entry, stageStatus)
                const label = statusLabel(entry, stageStatus)
                const dName = r.displayName || r.name

                return (
                  <div
                    key={r.name}
                    className="animate-stagger-in"
                    style={{ animationDelay: `${Math.min(idx * 25, 500)}ms` }}
                  >
                    <div className="flex items-center gap-2.5 rounded-lg border border-stone-100/80 bg-white/50 p-2.5 transition-colors duration-150 hover:bg-white/70">
                      <ScholarPhoto scholarId={r.scholarId} displayName={dName} stageId={stageId} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-stone-700 truncate leading-tight">
                          {dName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <StatusDot group={group} hsl={hsl} />
                          <span className="text-[11px] text-stone-400 leading-none">
                            {label}
                          </span>
                          {entry?.durationSec != null && entry.status === 'success' && (
                            <span className="text-[10px] text-stone-300 tabular-nums leading-none">
                              {entry.durationSec.toFixed(0)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
