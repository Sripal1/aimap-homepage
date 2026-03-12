import { cn, formatDuration } from '@/lib/utils'
import { STAGE_HSL_MAP } from './stage-colors'
import type { StageProgress, StageId } from '@/types'

interface Props {
  stages: StageProgress[]
  activeStageId: StageId | undefined
  onSelectStage: (id: StageId) => void
}

function ActiveDot({ stageId }: { stageId: StageId }) {
  const hsl = STAGE_HSL_MAP[stageId]
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{ backgroundColor: `hsla(${hsl}, 0.1)` }}
      >
        <span
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: `hsl(${hsl})` }}
        />
      </div>
    </div>
  )
}

function DoneDot({ stageId }: { stageId: StageId }) {
  const hsl = STAGE_HSL_MAP[stageId]
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{ backgroundColor: `hsla(${hsl}, 0.12)` }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2.5 5.5L4.5 7.5L7.5 3"
            stroke={`hsl(${hsl})`}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

function FailedDot() {
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <div className="w-[18px] h-[18px] rounded-full bg-red-50 flex items-center justify-center">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 2L6 6M6 2L2 6" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

function QueuedDot() {
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-stone-300" />
    </div>
  )
}

function PendingDot() {
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <span className="h-2 w-2 rounded-full border border-stone-200" />
    </div>
  )
}

function StageStatusDot({ stage }: { stage: StageProgress }) {
  switch (stage.status) {
    case 'done':
      return <DoneDot stageId={stage.id} />
    case 'failed':
      return <FailedDot />
    case 'running':
      return <ActiveDot stageId={stage.id} />
    case 'queued':
      return <QueuedDot />
    default:
      return <PendingDot />
  }
}

export default function StageTimeline({ stages, activeStageId, onSelectStage }: Props) {
  return (
    <>
      {/* Desktop: vertical timeline */}
      <nav className="hidden lg:flex flex-col gap-0.5 w-52 flex-shrink-0">
        {stages.map((stage, i) => {
          const isActive = stage.id === activeStageId
          const hsl = STAGE_HSL_MAP[stage.id]
          const dur = stage.timing.durationMs ? formatDuration(stage.timing.durationMs) : null
          const isLast = i === stages.length - 1

          return (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage.id)}
              className={cn(
                'relative flex items-start gap-3 pl-3 pr-2 py-2.5 rounded-xl text-left transition-all duration-150 group',
                isActive
                  ? 'backdrop-blur-md shadow-glass-sm border border-white/40'
                  : 'hover:bg-white/40 hover:backdrop-blur-sm',
              )}
              style={isActive ? { backgroundColor: `hsla(${hsl}, 0.08)` } : undefined}
            >
              {/* Connector line */}
              {!isLast && (
                <div className={cn(
                  'absolute left-[22px] top-[34px] w-px h-[calc(100%-14px)] transition-colors duration-300',
                  stage.status === 'done' ? 'bg-stone-300/60' : 'bg-stone-200/60',
                )} />
              )}

              <div className="relative z-10 mt-0.5 flex-shrink-0">
                <StageStatusDot stage={stage} />
              </div>

              <div className="min-w-0 flex-1">
                <div className={cn(
                  'text-sm font-medium truncate transition-colors duration-80',
                  isActive ? 'text-stone-800' : 'text-stone-500 group-hover:text-stone-600',
                )}>
                  {stage.label}
                </div>
                {dur && (
                  <div className="text-[11px] text-stone-400 mt-0.5 tabular-nums">{dur}</div>
                )}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Mobile: horizontal dot row */}
      <nav className="flex lg:hidden items-center justify-center gap-3 pb-4">
        {stages.map((stage) => {
          const isActive = stage.id === activeStageId
          const hsl = STAGE_HSL_MAP[stage.id]

          return (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage.id)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'backdrop-blur-md shadow-glass-sm border border-white/40'
                  : 'hover:bg-white/40',
              )}
              style={isActive ? { backgroundColor: `hsla(${hsl}, 0.08)` } : undefined}
              title={stage.label}
            >
              <StageStatusDot stage={stage} />
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-stone-700' : 'text-stone-400',
              )}>
                {stage.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
