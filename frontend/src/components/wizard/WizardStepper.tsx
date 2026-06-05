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
  const totalSteps = steps.length

  return (
    <div className="mb-6">
      {/* Progress bar with gradient and percentage text */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex-1 h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso: ${Math.round(progress)}% completo, passo ${currentStep} de ${steps.length}`}
        >
          <div
            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-xs text-[var(--color-subtle)] font-medium shrink-0" aria-live="polite" aria-atomic="true">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Steps dots with connector lines */}
      <div className="flex items-center justify-between mb-3 px-1 relative" role="group" aria-label="Navegação de passos">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep
          const isCompleted = completedSteps.includes(step.number)
          const isPast = step.number < currentStep
          const clickable = !!onStepClick && (isCompleted || isPast || isActive)

          let stepStatus = 'não iniciado'
          if (isCompleted) stepStatus = 'completado'
          if (isActive) stepStatus = 'atual'
          if (isPast && !isCompleted) stepStatus = 'visitado'

          return (
            <button
              key={step.number}
              type="button"
              onClick={() => clickable && onStepClick?.(step.number)}
              disabled={!clickable}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Passo ${step.number}: ${step.title} (${stepStatus})${clickable ? ', clicável' : ''}`}
              className={cn(
                'flex flex-col items-center gap-1.5 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-lg p-1 relative z-10',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              {/* Connector line after each step except the last */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5 -z-10',
                    step.number <= currentStep || isCompleted
                      ? 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]'
                      : 'bg-[var(--color-surface-2)]',
                  )}
                  aria-hidden="true"
                />
              )}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  isActive && 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] text-white scale-110 shadow-lg',
                  isCompleted && 'bg-gradient-to-r from-[var(--color-success)] to-[var(--color-success)] text-white scale-105',
                  !isActive && !isCompleted && isPast && 'bg-[var(--color-accent)]/30 text-[var(--color-accent)]',
                  !isActive && !isCompleted && !isPast && 'bg-[var(--color-surface-2)] text-[var(--color-muted)] border border-[var(--color-border)]',
                  clickable && 'hover:ring-2 hover:ring-[var(--color-accent)]/30',
                  isCompleted && 'animate-in scale-in duration-200',
                )}
                aria-hidden="true"
              >
                {isCompleted ? (
                  <Check size={18} className="animate-in scale-in duration-200" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block transition-colors',
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
            <p className="text-sm text-[var(--color-muted)] mt-0.5">{steps[currentStep - 1].subtitle}</p>
          )}
        </div>
        <span className="text-xs text-[var(--color-subtle)] font-medium" aria-live="polite" aria-atomic="true">
          {currentStep}/{totalSteps}
        </span>
      </div>
    </div>
  )
}
