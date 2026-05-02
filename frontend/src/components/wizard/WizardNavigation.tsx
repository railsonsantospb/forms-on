import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  isNextDisabled?: boolean
  isNextLoading?: boolean
  nextLabel?: string
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  isNextDisabled,
  isNextLoading,
  nextLabel = 'Avançar',
}: WizardNavigationProps) {
  const isLast = currentStep === totalSteps

  return (
    <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={currentStep === 1}
      >
        <ChevronLeft size={16} /> Voltar
      </Button>

      {!isLast && (
        <Button
          variant="primary"
          onClick={onNext}
          disabled={isNextDisabled}
          isLoading={isNextLoading}
        >
          {nextLabel} <ChevronRight size={16} />
        </Button>
      )}
    </div>
  )
}
