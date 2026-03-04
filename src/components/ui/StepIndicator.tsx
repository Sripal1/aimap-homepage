import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export default function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps) {
  return (
    <nav className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const completed = i < currentStep
        const current = i === currentStep
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-8 sm:w-12',
                  i <= currentStep ? 'bg-brand-teal' : 'bg-stone-200',
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  completed && 'bg-brand-teal text-white',
                  current && 'bg-brand-teal text-white',
                  !completed && !current && 'border-2 border-stone-200 text-stone-400',
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  current ? 'font-medium text-stone-800' : 'text-stone-400',
                )}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
