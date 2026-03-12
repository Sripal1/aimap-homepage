import { cn, formatDuration } from '@/lib/utils'
import { STAGE_COLOR_MAP, STAGE_HSL_MAP } from './stage-colors'
import ResearcherList from './ResearcherList'
import type { StageProgress, ResearcherInfo, ResearcherLogStatus } from '@/types'

interface Props {
  stage: StageProgress
}

export default function StageDetailPanel({ stage }: Props) {
  const colors = STAGE_COLOR_MAP[stage.id]
  const hsl = STAGE_HSL_MAP[stage.id]

  // Aggregate researchers across all chunks
  const allStatuses = new Map<string, ResearcherLogStatus>()
  const allResearchers: ResearcherInfo[] = []
  const seenNames = new Set<string>()

  stage.chunks?.forEach(chunk => {
    chunk.researcherStatuses?.forEach((status, name) => allStatuses.set(name, status))
    chunk.researchers.forEach(r => {
      if (!seenNames.has(r.name)) {
        seenNames.add(r.name)
        allResearchers.push(r)
      }
    })
  })

  const totalResearchers = allResearchers.length
  const completedResearchers = allStatuses.size > 0
    ? [...allStatuses.values()].filter(s => s.status === 'success').length
    : stage.status === 'done' ? totalResearchers : 0

  const dur = stage.timing.durationMs ? formatDuration(stage.timing.durationMs) : null
  const isRunning = stage.status === 'running'

  return (
    <div className="flex-1 min-w-0 animate-fade-in">
      {/* Stage header */}
      <div className="mb-4">
        <h3 className={cn('text-lg font-semibold', colors.text)}>
          {stage.label}
        </h3>
        <p className="text-sm text-stone-400 mt-0.5">{stage.description}</p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-stone-500 flex-wrap">
          {totalResearchers > 0 && (
            <span className="tabular-nums">
              <span className="font-semibold text-stone-600">{completedResearchers}</span> of {totalResearchers} professors done
            </span>
          )}
          {dur && <span className="tabular-nums">{dur}</span>}
        </div>

        {/* Stage progress bar — Safari style */}
        {stage.status !== 'pending' && (
          <div
            className="mt-3 h-[3px] w-full rounded-full overflow-hidden"
            style={{ backgroundColor: `hsla(${hsl}, 0.12)` }}
          >
            <div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                width: `${stage.completedFraction * 100}%`,
                background: stage.status === 'failed'
                  ? 'linear-gradient(90deg, #ef4444 0%, #f87171 50%, #ef4444 100%)'
                  : `linear-gradient(90deg, hsl(${hsl}) 0%, hsl(${hsl}) 100%)`,
                boxShadow: isRunning
                  ? `0 0 10px hsla(${hsl}, 0.5), 0 0 4px hsla(${hsl}, 0.3)`
                  : `0 0 4px hsla(${hsl}, 0.15)`,
                transition: 'width 80ms ease-out',
              }}
            >
              {isRunning && (
                <div
                  className="absolute inset-0 rounded-full overflow-hidden"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                    backgroundSize: '50% 100%',
                    animation: 'safariShine 1s linear infinite',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Researcher grid */}
      {totalResearchers > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-stone-500 mb-3">
            Faculty Members
          </p>
          <ResearcherList
            researchers={allResearchers}
            researcherStatuses={allStatuses.size > 0 ? allStatuses : undefined}
            stageStatus={stage.status}
            stageId={stage.id}
          />
        </div>
      )}

    </div>
  )
}
