import { useMemo, useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ValidationErrorsModal } from '@/components/ui/modal'
import { useAnexo1WizardStore, defaultFormData as anexo1DefaultFormData } from '../store/useAnexo1WizardStore'
import { WizardStepper } from '@/components/wizard/WizardStepper'
import { WizardNavigation } from '@/components/wizard/WizardNavigation'
import { StepTransition } from '@/components/wizard/StepTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChatModal } from '@/features/chat/components/ChatModal'
import { createAnexo1ChatFlow } from '@/features/anexo1/lib/chatFlow'
import { applyChatDataToForm } from '@/features/chat/lib/applyChatData'
import { useAnexo1Preview, useAnexo1Generate, useAnexo1Prefill } from '@/api/anexo1'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { isEquivalentToDefault } from '@/lib/object-utils'
import { isWeekend, daysDiff, todayISO } from '@/lib/dates'
import { anexo1Schema } from '@/features/anexo1/schemas/anexo1.schema'
import { STEPS, TOTAL_STEPS, getStepPaths, getFieldLabel } from '@/features/anexo1/lib/wizardHelpers'
import { Step1Tipo } from '@/features/anexo1/components/steps/Step1Tipo'
import { Step2Servidor } from '@/features/anexo1/components/steps/Step2Servidor'
import { TrechosStep } from '@/features/anexo1/components/steps/TrechosStep'
import { Step5Missao } from '@/features/anexo1/components/steps/Step5Missao'
import { Step6Motivo } from '@/features/anexo1/components/steps/Step6Motivo'
import { Step7Recurso } from '@/features/anexo1/components/steps/Step7Recurso'
import { Step8Justificativas } from '@/features/anexo1/components/steps/Step8Justificativas'
import { Step9Revisao } from '@/features/anexo1/components/steps/Step9Revisao'
import type { Anexo1Payload } from '@/types'

export function Anexo1Wizard() {
  const store = useAnexo1WizardStore()
  const preview = useAnexo1Preview()
  const generate = useAnexo1Generate()
  const prefill = useAnexo1Prefill()
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [hasTriedToAdvance, setHasTriedToAdvance] = useState(false)
  const [trechoModal, setTrechoModal] = useState<{ open: boolean; errors: string[] }>({ open: false, errors: [] })
  const [validationModal, setValidationModal] = useState<{ open: boolean; errors: Array<{ field: string; message: string }> }>({ open: false, errors: [] })

  const data = store.formData

  // Auto-save
  const { restore, clear } = useAutoSave<Partial<Anexo1Payload>>('ufpb-wizard-anexo1', data)
  useBeforeUnload(true)

  // Restore on mount
  useEffect(() => {
    const doRestore = async () => {
      const saved = await restore()
      if (saved) {
        if (!isEquivalentToDefault(saved as Record<string, unknown>, anexo1DefaultFormData as Record<string, unknown>)) {
          store.applyPayload(saved)
          toast.info('Rascunho anterior restaurado do navegador')
        } else {
          clear()
        }
      }
    }
    doRestore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAutoFlags = useCallback(() => {
    try {
      const tipo = data.tipo_solicitacao || 'diarias'
      const prazoDias = tipo === 'passagens' ? 30 : 10
      const dataSolic = data.data_solicitacao || todayISO()

      let fds = false
      let foraPrazo = false

      if (data.trechos?.ida?.[0]?.data_hora) {
        const idaDate = data.trechos.ida[0].data_hora.slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(idaDate) && !isNaN(new Date(idaDate).getTime())) {
          try {
            fds = isWeekend(idaDate)
            const diff = daysDiff(dataSolic, idaDate)
            foraPrazo = diff < prazoDias
          } catch (err) {
            console.warn('Erro ao calcular flags de data:', err)
          }
        }
      }

      store.setAutoFlags({ foraDoPrazo: foraPrazo, fds })
      store.setFieldValue('flags.fora_do_prazo', foraPrazo)
    } catch (err) {
      console.error('Erro em refreshAutoFlags:', err)
      store.setAutoFlags({ foraDoPrazo: false, fds: false })
      store.setFieldValue('flags.fora_do_prazo', false)
    }
  }, [store.setAutoFlags, store.setFieldValue, data.tipo_solicitacao, data.data_solicitacao, data.trechos])

  // Refresh auto flags when entering step 8
  useEffect(() => {
    if (store.currentStep === 8) {
      refreshAutoFlags()
    }
  }, [store.currentStep, refreshAutoFlags])

  // Sync justificativas automatically
  useEffect(() => {
    if (data.flags?.fora_do_prazo && data.justificativas?.justificativa_fora_prazo && !data.justificativas?.just_viagem_urgente?.trim()) {
      store.setFieldValue('justificativas.just_viagem_urgente', data.justificativas.justificativa_fora_prazo)
    }
    if (data.flags?.envolve_fds_feriado_ou_dia_anterior && data.justificativas?.justificativa_fds_feriado_dia_anterior && !data.justificativas?.just_fds_feriado?.trim()) {
      store.setFieldValue('justificativas.just_fds_feriado', data.justificativas.justificativa_fds_feriado_dia_anterior)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.flags?.fora_do_prazo, data.flags?.envolve_fds_feriado_ou_dia_anterior, data.justificativas?.justificativa_fora_prazo, data.justificativas?.justificativa_fds_feriado_dia_anterior])

  const buildPayload = useCallback((): Anexo1Payload => {
    const servidor = { ...(data.servidor || {}) } as Record<string, unknown>
    if (servidor.auxilio_transporte) {
      const at = servidor.auxilio_transporte as Record<string, unknown>
      if (at.recebe === undefined) {
        servidor.auxilio_transporte = { ...at, recebe: at.valor !== undefined && at.valor !== '' }
      }
    }
    if (servidor.auxilio_alimentacao) {
      const aa = servidor.auxilio_alimentacao as Record<string, unknown>
      if (aa.recebe === undefined) {
        servidor.auxilio_alimentacao = { ...aa, recebe: aa.valor !== undefined && aa.valor !== '' }
      }
    }

    return {
      tipo_solicitacao: (data.tipo_solicitacao as 'diarias' | 'passagens' | 'diarias_e_passagens') || 'diarias',
      data_solicitacao: data.data_solicitacao || todayISO(),
      servidor: servidor as unknown as Anexo1Payload['servidor'],
      motivo_viagem: data.motivo_viagem || '',
      relacao_pertinencia: data.relacao_pertinencia || '',
      trechos: {
        ida: data.trechos?.ida || [],
        retorno: data.trechos?.retorno || [],
      },
      missao: {
        inicio_data_hora: data.missao?.inicio_data_hora || '',
        termino_data_hora: data.missao?.termino_data_hora || '',
      },
      debito_recurso: {
        tipo: (data.debito_recurso?.tipo as 'cchsa' | 'cavn' | 'projeto' | 'outros') || 'cchsa',
        detalhe: (['projeto', 'outros'].includes(data.debito_recurso?.tipo || '') ? data.debito_recurso?.detalhe : undefined),
      },
      transporte: {
        meios: (data.transporte?.meios as Anexo1Payload['transporte']['meios']) || [],
        distancia_km: data.transporte?.distancia_km,
        termo_veiculo_proprio_ciente: data.transporte?.termo_veiculo_proprio_ciente,
      },
      flags: data.flags,
      justificativas: data.justificativas,
    }
  }, [data])

  // Reset "tried to advance" flag when step changes so new steps start clean
  useEffect(() => {
    setHasTriedToAdvance(false)
  }, [store.currentStep])

  // Clear errors when user corrects fields (only runs when hasTriedToAdvance=true)
  useEffect(() => {
    if (store.currentStep >= 9) return
    const payload = buildPayload()
    const currentPaths = getStepPaths(store.currentStep)
    try {
      anexo1Schema.parse(payload)
      setStepErrors((prev) => {
        if (Object.keys(prev).length === 0) return prev
        return {}
      })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        const newErrors: Record<string, string> = {}
        for (const issue of issues) {
          const path = issue.path.join('.')
          if (currentPaths.some((prefix) => path.startsWith(prefix))) {
            newErrors[path] = issue.message
          }
        }
        setStepErrors(newErrors)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, store.currentStep])

  const validateCurrentStep = useCallback((): { valid: boolean; currentErrors: Record<string, string> } => {
    const payload = buildPayload()
    const step = store.currentStep
    const currentStepErrors: Record<string, string> = {}

    try {
      anexo1Schema.parse(payload)
      setStepErrors({})
      return { valid: true, currentErrors: {} }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        const currentStepPaths = getStepPaths(step)
        for (const issue of issues) {
          const path = issue.path.join('.')
          if (currentStepPaths.some((prefix) => path.startsWith(prefix))) {
            currentStepErrors[path] = issue.message
          }
        }
      } else if (err instanceof Error) {
        console.error('Unexpected error during validation:', err)
        currentStepErrors['_error'] = err.message || 'Erro inesperado na validação'
      }
      setStepErrors(currentStepErrors)
      return { valid: Object.keys(currentStepErrors).length === 0, currentErrors: currentStepErrors }
    }
  }, [buildPayload, store.currentStep])

  const goNext = () => {
    setHasTriedToAdvance(true)
    const { valid, currentErrors } = validateCurrentStep()
    if (valid) {
      setDirection('forward')
      store.setStepValidation(store.currentStep, true)
      store.nextStep()
    } else {
      const isTrechoStep = store.currentStep === 3 || store.currentStep === 4
      const trechoErrors = isTrechoStep
        ? Object.entries(currentErrors)
            .filter(([path]) => path.startsWith('trechos.'))
            .map(([, message]) => message)
        : []
      if (trechoErrors.length > 0) {
        setTrechoModal({ open: true, errors: trechoErrors })
      } else {
        const errors = Object.entries(currentErrors).map(([path, message]) => ({
          field: getFieldLabel(path),
          message,
        }))
        setValidationModal({ open: true, errors })
      }
    }
  }

  const goBack = () => {
    setDirection('backward')
    store.prevStep()
  }

  const handleGenerate = async (format: 'docx' | 'pdf') => {
    const payload = buildPayload()

    let previewRes: { ok: boolean; errors?: Array<{ field: string; message: string }>; issues?: Array<{ field: string; message: string }> }
    try {
      previewRes = await preview.mutateAsync(payload)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
        const apiErr = err as { status: number; body: Record<string, unknown>; message: string }
        const bodyErrors = Array.isArray(apiErr.body.errors)
          ? (apiErr.body.errors as Array<{ field: string; message: string }>)
          : Array.isArray(apiErr.body.issues)
            ? (apiErr.body.issues as Array<{ field: string; message: string }>)
            : []
        setValidationModal({
          open: true,
          errors: bodyErrors.length > 0
            ? bodyErrors.map((e) => ({ field: getFieldLabel(e.field), message: e.message }))
            : [{ field: 'Erro de validação', message: apiErr.message }],
        })
      } else {
        setValidationModal({
          open: true,
          errors: [{ field: 'Erro de conexão', message: err instanceof Error ? err.message : 'Não foi possível validar os dados. Tente novamente.' }],
        })
      }
      return
    }

    if (!previewRes.ok) {
      const rawErrors = previewRes.errors || previewRes.issues || []
      const errors = rawErrors.map((issue) => ({
        field: getFieldLabel(issue.field),
        message: issue.message,
      }))
      setValidationModal({ open: true, errors })
      return
    }

    try {
      const { blob, filename } = await generate.mutateAsync({ format, payload })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Documento ${format.toUpperCase()} gerado com sucesso!`)
      clear()
    } catch (err: unknown) {
      setValidationModal({
        open: true,
        errors: [{ field: 'Erro na geração', message: err instanceof Error ? err.message : 'Não foi possível gerar o documento. Tente novamente.' }],
      })
    }
  }

  const handleImport = async (file: File): Promise<{ prefill: Record<string, unknown>; warnings?: string[] }> => {
    const result = await prefill.mutateAsync(file)
    if (result.prefill) {
      store.applyPayload(result.prefill as Partial<Anexo1Payload>)
      toast.success('Dados importados do documento!')
    }
    return result as { prefill: Record<string, unknown>; warnings?: string[] }
  }

  const handleReset = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados?')) {
      store.reset()
      clear()
      toast.info('Formulário reiniciado')
    }
  }

  const completedSteps = useMemo(() => {
    const completed: number[] = []
    for (let i = 1; i < store.currentStep; i++) {
      if (store.stepValidation[i]) completed.push(i)
    }
    return completed
  }, [store.currentStep, store.stepValidation])

  return (
    <div>
      <WizardStepper steps={STEPS} currentStep={store.currentStep} completedSteps={completedSteps} onStepClick={(step) => { setDirection(step < store.currentStep ? 'backward' : 'forward'); store.goToStep(step) }} />

      <Card>
        <CardContent className="pt-5">
          <StepTransition step={store.currentStep} direction={direction}>
            {/* STEP 1 — Tipo */}
            {store.currentStep === 1 && (
              <Step1Tipo
                data={data}
                stepErrors={hasTriedToAdvance ? stepErrors : {}}
                onFieldChange={store.setFieldValue}
                onImport={handleImport}
                onOpenChat={() => store.setChatOpen(true)}
              />
            )}

            {/* STEP 2 — Servidor */}
            {store.currentStep === 2 && (
              <Step2Servidor
                data={data}
                stepErrors={hasTriedToAdvance ? stepErrors : {}}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 3 & 4 — Trechos */}
            {(store.currentStep === 3 || store.currentStep === 4) && (
              <TrechosStep
                type={store.currentStep === 3 ? 'ida' : 'retorno'}
                trechos={data.trechos?.[store.currentStep === 3 ? 'ida' : 'retorno'] || []}
                onAdd={() => store.addTrecho(store.currentStep === 3 ? 'ida' : 'retorno')}
                onRemove={(i) => store.removeTrecho(store.currentStep === 3 ? 'ida' : 'retorno', i)}
                onUpdate={(i, field, value) => store.updateTrecho(store.currentStep === 3 ? 'ida' : 'retorno', i, field, value)}
                errors={hasTriedToAdvance ? stepErrors : {}}
              />
            )}

            {/* STEP 5 — Missão */}
            {store.currentStep === 5 && (
              <Step5Missao
                data={data}
                stepErrors={hasTriedToAdvance ? stepErrors : {}}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 6 — Motivo */}
            {store.currentStep === 6 && (
              <Step6Motivo
                data={data}
                stepErrors={hasTriedToAdvance ? stepErrors : {}}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 7 — Recurso */}
            {store.currentStep === 7 && (
              <Step7Recurso
                data={data}
                stepErrors={hasTriedToAdvance ? stepErrors : {}}
                onFieldChange={store.setFieldValue}
                onToggleTransporte={store.toggleTransporte}
              />
            )}

            {/* STEP 8 — Justificativas */}
            {store.currentStep === 8 && (
              <Step8Justificativas
                data={data}
                stepErrors={hasTriedToAdvance ? stepErrors : {}}
                autoFlags={store.autoFlags}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 9 — Revisão */}
            {store.currentStep === 9 && (
              <Step9Revisao
                data={data}
                autoFlags={store.autoFlags}
                isPending={generate.isPending}
                onGenerate={handleGenerate}
                onReset={handleReset}
                onGoToStep={store.goToStep}
                setDirection={setDirection}
              />
            )}
          </StepTransition>

          {/* Navigation */}
          {store.currentStep < 9 && (
            <WizardNavigation
              currentStep={store.currentStep}
              totalSteps={TOTAL_STEPS}
              onBack={goBack}
              onNext={goNext}
            />
          )}
        </CardContent>
      </Card>

      {/* Chat Modal */}
      <ChatModal
        isOpen={store.isChatOpen}
        onClose={() => store.setChatOpen(false)}
        flow={createAnexo1ChatFlow((chatData) => {
          applyChatDataToForm(chatData, store.setFieldValue)
          for (let i = 1; i <= 8; i++) store.setStepValidation(i, true)
          store.setChatOpen(false)
          store.goToStep(9)
          toast.success('Dados do assistente aplicados! Revise na tela de conferência.')
        })}
        onApply={() => store.setChatOpen(false)}
        title="Dira — Assistente Anexo I"
        externalState={store.chatState}
        setExternalState={store.setChatState}
      />

      {/* Modal de erros nos trechos */}
      {trechoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-2xl border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center">
                <span className="text-[var(--color-danger)] text-lg font-bold">!</span>
              </div>
              <h3 className="text-lg font-semibold">Erro nos trechos de viagem</h3>
            </div>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              Foram encontrados problemas de data/hora nos trechos. Corrija antes de continuar:
            </p>
            <ul className="space-y-2 mb-6">
              {trechoModal.errors.map((err, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[var(--color-danger)] mt-0.5">•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setTrechoModal({ open: false, errors: [] })}>
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal genérico de erros de validação */}
      <ValidationErrorsModal
        open={validationModal.open}
        onClose={() => setValidationModal({ open: false, errors: [] })}
        errors={validationModal.errors}
      />
    </div>
  )
}
