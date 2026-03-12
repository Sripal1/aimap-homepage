import { STAGE_HSL_MAP } from './stage-colors'
import type { StageProgress, StageId } from '@/types'

interface Props {
  stages: StageProgress[]
  overallProgress: number
}

const STAGE_GLOW_MAP: Record<string, string> = {
  prepare: 'hsla(215, 70%, 58%, 0.4)',
  scrape: 'hsla(198, 55%, 55%, 0.4)',
  combine: 'hsla(182, 50%, 52%, 0.4)',
  summarize: 'hsla(168, 52%, 50%, 0.4)',
  finalize: 'hsla(152, 55%, 52%, 0.4)',
  deploy: 'hsla(142, 62%, 55%, 0.4)',
}

/**
 * Build a single continuous gradient where stage colors smoothly
 * blend into each other at the boundaries (no hard edges).
 */
function buildBlendedGradient(
  segments: { id: StageId; start: number; end: number; status: string }[],
  blendZone: number,
): string {
  const stops: string[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const color = seg.status === 'failed'
      ? 'hsl(0, 72%, 72%)'
      : `hsl(${STAGE_HSL_MAP[seg.id]})`

    if (i === 0) {
      // First stage: solid from 0% to (end - blend)
      stops.push(`${color} 0%`)
      stops.push(`${color} ${Math.max(0, seg.end - blendZone)}%`)
    } else {
      // Subsequent stages: color starts at (start + blend), solid to (end - blend)
      // The gap between previous (end - blend) and this (start + blend) is the fade zone
      stops.push(`${color} ${Math.min(100, seg.start + blendZone)}%`)
      const solidEnd = Math.max(seg.start + blendZone, seg.end - blendZone)
      if (i < segments.length - 1) {
        stops.push(`${color} ${solidEnd}%`)
      } else {
        // Last stage: solid to 100%
        stops.push(`${color} 100%`)
      }
    }
  }

  return `linear-gradient(90deg, ${stops.join(', ')})`
}

export default function SegmentedProgressBar({ stages, overallProgress }: Props) {
  const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0) || 1

  // Calculate stage boundaries
  let cumPos = 0
  const segments = stages.map(stage => {
    const width = (stage.weight / totalWeight) * 100
    const start = cumPos
    cumPos += width
    return {
      id: stage.id,
      start,
      end: cumPos,
      width,
      fraction: stage.completedFraction,
      status: stage.status,
      label: stage.label,
    }
  })

  // The fill extends to the furthest filled point (continuous from left)
  let fillExtent = 0
  for (const seg of segments) {
    if (seg.fraction > 0) {
      fillExtent = seg.start + seg.width * seg.fraction
    }
  }

  // Build the blended gradient across full bar width
  const gradient = buildBlendedGradient(segments, 3)

  // Shimmer if any stage is running
  const hasRunning = stages.some(s => s.status === 'running')

  // Glow from the leading (rightmost filled) stage
  const leadingStage = [...segments].reverse().find(s => s.fraction > 0)
  const glowColor = leadingStage ? STAGE_GLOW_MAP[leadingStage.id] : undefined

  // Scale factor: gradient covers full track, but fill div is narrower
  // so we stretch the gradient container to maintain correct color positions
  const gradientScale = fillExtent > 0 ? (10000 / fillExtent) : 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span className="font-medium uppercase tracking-wide text-[11px]">Overall Progress</span>
        <span className="font-semibold text-stone-700 tabular-nums">{overallProgress}%</span>
      </div>

      {/* Glass track */}
      <div className="relative h-3 w-full rounded-full bg-white/60 backdrop-blur-sm border border-white/40 shadow-glass-sm overflow-hidden">
        {/* Continuous blended fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out overflow-hidden"
          style={{
            width: `${fillExtent}%`,
            boxShadow: glowColor
              ? `0 0 12px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.3)`
              : 'inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {/* Gradient layer — stretched so color positions match full track width */}
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${gradientScale}%`,
              background: gradient,
            }}
          />

          {/* Shimmer overlay */}
          {hasRunning && (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 60%, transparent 100%)',
                backgroundSize: '40% 100%',
                animation: 'safariShine 1.5s ease-in-out infinite',
              }}
            />
          )}

          {/* Inner glass highlight */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/30 to-transparent rounded-full" />
        </div>
      </div>
    </div>
  )
}
