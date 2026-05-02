import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

interface Step {
  number: number
  title: string
  subtitle?: string
}

interface WizardStepperProps {
  steps: Step[]
  currentStep: number
  completedSteps?: number[]
  onStepClick?: (step: number) => void
}

export function WizardStepper({ steps, currentStep, completedSteps = [], onStepClick }: WizardStepperProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps dots */}
      <div className="flex items-center justify-between mb-3 px-1">
        {steps.map((step) => {
          const isActive = step.number === currentStep
          const isCompleted = completedSteps.includes(step.number)
          const isPast = step.number < currentStep
          const clickable = !!onStepClick && (isCompleted || isPast || isActive)

          return (
            <button
              key={step.number}
              type="button"
              onClick={() => clickable && onStepClick?.(step.number)}
              disabled={!clickable}
              className={cn(
                'flex flex-col items-center gap-1.5 flex-1',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  isActive && 'bg-[var(--color-accent)] text-white scale-110',
                  isCompleted && 'bg-[var(--color-success)] text-white',
                  !isActive && !isCompleted && isPast && 'bg-[var(--color-accent)]/30 text-[var(--color-accent)]',
                  !isActive && !isCompleted && !isPast && 'bg-[var(--color-surface-2)] text-[var(--color-muted)] border border-[var(--color-border)]',
                  clickable && 'hover:ring-2 hover:ring-[var(--color-accent)]/30',
                )}
              >
                {isCompleted ? <Check size={18} /> : step.number}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:block transition-colors',
                  isActive ? 'text-[var(--color-accent)]' : isCompleted ? 'text-[var(--color-success)]' : 'text-[var(--color-subtle)]',
                )}
              >
                {step.title}
              </span>
            </button>
          )
        })}
      </div>

      {/* Step info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Passo {currentStep} — {steps[currentStep - 1]?.title}
          </h2>
          {steps[currentStep - 1]?.subtitle && (
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              {steps[currentStep - 1].subtitle}
            </p>
          )}
        </div>
        <span className="text-xs text-[var(--color-subtle)] font-medium">
          {currentStep}/{steps.length}
        </span>
      </div>
    </div>
  )
}
