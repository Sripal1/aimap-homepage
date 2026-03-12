import type { StageId } from '@/types'

export interface StageColorClasses {
  text: string
  bg: string
  dim: string
  border: string
  dot: string
}

export const STAGE_COLOR_MAP: Record<StageId, StageColorClasses> = {
  prepare: {
    text: 'text-stage-prepare',
    bg: 'bg-stage-prepare',
    dim: 'bg-stage-prepare-dim',
    border: 'border-stage-prepare-border',
    dot: 'bg-stage-prepare',
  },
  scrape: {
    text: 'text-stage-scrape',
    bg: 'bg-stage-scrape',
    dim: 'bg-stage-scrape-dim',
    border: 'border-stage-scrape-border',
    dot: 'bg-stage-scrape',
  },
  combine: {
    text: 'text-stage-combine',
    bg: 'bg-stage-combine',
    dim: 'bg-stage-combine-dim',
    border: 'border-stage-combine-border',
    dot: 'bg-stage-combine',
  },
  summarize: {
    text: 'text-stage-summarize',
    bg: 'bg-stage-summarize',
    dim: 'bg-stage-summarize-dim',
    border: 'border-stage-summarize-border',
    dot: 'bg-stage-summarize',
  },
  finalize: {
    text: 'text-stage-finalize',
    bg: 'bg-stage-finalize',
    dim: 'bg-stage-finalize-dim',
    border: 'border-stage-finalize-border',
    dot: 'bg-stage-finalize',
  },
  deploy: {
    text: 'text-stage-deploy',
    bg: 'bg-stage-deploy',
    dim: 'bg-stage-deploy-dim',
    border: 'border-stage-deploy-border',
    dot: 'bg-stage-deploy',
  },
}

/** CSS gradient strings per stage for detail panel progress bars */
export const STAGE_GRADIENT_MAP: Record<StageId, string> = {
  prepare: 'linear-gradient(90deg, hsl(215, 70%, 58%), hsl(215, 75%, 65%), hsl(215, 70%, 58%))',
  scrape: 'linear-gradient(90deg, hsl(198, 55%, 55%), hsl(198, 60%, 62%), hsl(198, 55%, 55%))',
  combine: 'linear-gradient(90deg, hsl(182, 50%, 52%), hsl(182, 55%, 59%), hsl(182, 50%, 52%))',
  summarize: 'linear-gradient(90deg, hsl(168, 52%, 50%), hsl(168, 56%, 57%), hsl(168, 52%, 50%))',
  finalize: 'linear-gradient(90deg, hsl(152, 55%, 52%), hsl(152, 60%, 59%), hsl(152, 55%, 52%))',
  deploy: 'linear-gradient(90deg, hsl(142, 62%, 55%), hsl(142, 67%, 62%), hsl(142, 62%, 55%))',
}

/** Raw HSL values per stage for inline styles */
export const STAGE_HSL_MAP: Record<StageId, string> = {
  prepare: '215, 70%, 58%',
  scrape: '198, 55%, 55%',
  combine: '182, 50%, 52%',
  summarize: '168, 52%, 50%',
  finalize: '152, 55%, 52%',
  deploy: '142, 62%, 55%',
}
