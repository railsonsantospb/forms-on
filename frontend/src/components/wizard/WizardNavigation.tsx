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
  const isFirst = currentStep === 1
  const backDisabledMessage = isFirst ? ' (desabilitado - primeiro passo)' : ''

  return (
    <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={isFirst}
        aria-label={`Voltar para passo anterior (passo ${currentStep - 1} de ${totalSteps})${backDisabledMessage}`}
      >
        <ChevronLeft size={16} aria-hidden="true" /> Voltar
      </Button>

      {!isLast && (
        <Button
          variant="primary"
          onClick={onNext}
          disabled={isNextDisabled || isNextLoading}
          isLoading={isNextLoading}
          className="hover:scale-105 active:scale-95 hover:shadow-lg transition-all"
          aria-label={`${nextLabel} para próximo passo (passo ${currentStep + 1} de ${totalSteps})${isNextDisabled ? ' (desabilitado)' : ''}`}
        >
          {nextLabel} <ChevronRight size={16} aria-hidden="true" />
        </Button>
      )}

      {isLast && (
        <div className="text-sm text-[var(--color-success)] font-medium" role="status" aria-live="polite">
          Formulário completo - gere o documento
        </div>
      )}
    </div>
  )
}
