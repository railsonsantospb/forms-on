import { useMemo, useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ValidationErrorsModal } from '@/components/ui/modal'
import { useAnexo2WizardStore, defaultFormData as anexo2DefaultFormData } from '../store/useAnexo2WizardStore'
import { WizardStepper } from '@/components/wizard/WizardStepper'
import { WizardNavigation } from '@/components/wizard/WizardNavigation'
import { StepTransition } from '@/components/wizard/StepTransition'
import { Card, CardContent } from '@/components/ui/card'
import { ChatModal } from '@/features/chat/components/ChatModal'
import { createAnexo2ChatFlow } from '@/features/anexo2/lib/chatFlow'
import { applyChatDataToForm } from '@/features/chat/lib/applyChatData'
import { useAnexo2Preview, useAnexo2Generate, useAnexo2Prefill } from '@/api/anexo2'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { isEquivalentToDefault } from '@/lib/object-utils'
import { daysDiff, todayISO } from '@/lib/dates'
import { anexo2Schema } from '@/features/anexo2/schemas/anexo2.schema'
import type { Anexo2Payload } from '@/types'

import { Step1Data } from './steps/Step1Data'
import { Step2Proposto } from './steps/Step2Proposto'
import { Step3Afastamento } from './steps/Step3Afastamento'
import { Step4Atividades } from './steps/Step4Atividades'
import { Step5Prazo } from './steps/Step5Prazo'
import { Step6Confirmacao } from './steps/Step6Confirmacao'
import { Step7Revisao } from './steps/Step7Revisao'

const TOTAL_STEPS = 7

const STEPS = [
  { number: 1, title: 'Data', subtitle: 'Data de emissão do relatório de viagem.' },
  { number: 2, title: 'Proposto', subtitle: 'Dados pessoais e do órgão de exercício.' },
  { number: 3, title: 'Afastamento', subtitle: 'Trechos de ida e retorno da viagem.' },
  { number: 4, title: 'Atividades', subtitle: 'Descrição das atividades e tabela complementar.' },
  { number: 5, title: 'Prazo', subtitle: 'Verificação de prazo para prestação de contas.' },
  { number: 6, title: 'Confirmação', subtitle: 'Confirmação de realização da viagem.' },
  { number: 7, title: 'Revisão', subtitle: 'Revise o resumo e gere o documento.' },
]

export function Anexo2Wizard() {
  const store = useAnexo2WizardStore()
  const preview = useAnexo2Preview()
  const generate = useAnexo2Generate()
  const prefill = useAnexo2Prefill()
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [validationModal, setValidationModal] = useState<{ open: boolean; errors: Array<{ field: string; message: string }> }>({ open: false, errors: [] })

  const data = store.formData

  // Auto-save
  const { restore, clear } = useAutoSave<Partial<Anexo2Payload>>('ufpb-wizard-anexo2-v3', data)
  useBeforeUnload(true)

  useEffect(() => {
    const doRestore = async () => {
      const saved = await restore()
      if (saved) {
        if (!isEquivalentToDefault(saved as Record<string, unknown>, anexo2DefaultFormData as Record<string, unknown>)) {
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
    let foraPrazo = false
    if (data.afastamento?.retorno?.[0]?.data_hora) {
      const retDate = data.afastamento.retorno[data.afastamento.retorno.length - 1].data_hora.slice(0, 10)
      const diff = daysDiff(retDate, todayISO())
      foraPrazo = diff > 5
    }
    store.setAutoFlags({ foraDoPrazo: foraPrazo })
    if (foraPrazo && !data.flags?.prestacao_contas_fora_prazo) {
      store.setFieldValue('flags.prestacao_contas_fora_prazo', true)
    }
  }, [data, store])

  // Update flags automatically when arriving at step 5
  useEffect(() => {
    if (store.currentStep === 5) {
      refreshAutoFlags()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.currentStep])

  const buildPayload = useCallback((): Anexo2Payload => {
    return {
      data_relatorio: data.data_relatorio || todayISO(),
      proposto: data.proposto as Anexo2Payload['proposto'],
      afastamento: {
        ida: data.afastamento?.ida || [],
        retorno: data.afastamento?.retorno || [],
      },
      alteracoes_cancelamentos_noshow: (data.alteracoes_cancelamentos_noshow || []).filter(
        (row) => row.tipo && row.descricao?.trim()
      ),
      atividades_tabela: data.atividades_tabela,
      flags: data.flags,
      justificativa_prestacao_contas_fora_prazo: data.justificativa_prestacao_contas_fora_prazo,
      viagem_realizada: (data.viagem_realizada as 'sim' | 'nao') || 'sim',
    }
  }, [data])

  // Clear errors when user corrects fields
  useEffect(() => {
    if (store.currentStep >= 7) return
    const payload = buildPayload()
    try {
      anexo2Schema.parse(payload)
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
          newErrors[path] = issue.message
        }
        setStepErrors(newErrors)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, store.currentStep])

  const validateCurrentStep = useCallback((): boolean => {
    const payload = buildPayload()
    const step = store.currentStep
    const errors: Record<string, string> = {}

    try {
      anexo2Schema.parse(payload)
      setStepErrors({})
      return true
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        for (const issue of issues) {
          const path = issue.path.join('.')
          errors[path] = issue.message
        }
      }
      setStepErrors(errors)

      const currentStepPaths = getStepPaths(step)
      const hasCurrentStepError = Object.keys(errors).some((path) =>
        currentStepPaths.some((prefix) => path.startsWith(prefix)),
      )
      return !hasCurrentStepError
    }
  }, [buildPayload, store.currentStep])

  const getFieldLabel = useCallback((path: string): string => {
    const map: Record<string, string> = {
      'data_relatorio': 'Data do relatório',
      'proposto.nome': 'Nome completo',
      'proposto.cpf': 'CPF',
      'proposto.siape': 'SIAPE',
      'proposto.cargo_funcao': 'Cargo/Função',
      'proposto.telefone': 'Telefone',
      'proposto.email': 'E-mail',
      'proposto.orgao.tipo': 'Órgão de exercício',
      'proposto.orgao.detalhe': 'Detalhe do órgão',
      'afastamento.ida': 'Trechos de ida',
      'afastamento.retorno': 'Trechos de retorno',
      'atividades_tabela': 'Tabela de atividades',
      'justificativa_prestacao_contas_fora_prazo': 'Justificativa fora do prazo',
      'viagem_realizada': 'Viagem realizada?',
      'alteracoes_cancelamentos_noshow': 'Alterações / Cancelamentos / No Show',
    }
    if (map[path]) return map[path]
    const trechoMatch = path.match(/^(afastamento\.(ida|retorno)\.(\d+)\.(origem|destino|data_hora))$/)
    if (trechoMatch) {
      const [, , tipo, idx, campo] = trechoMatch
      const tipoLabel = tipo === 'ida' ? 'ida' : 'retorno'
      const campoLabel = campo === 'origem' ? 'Origem' : campo === 'destino' ? 'Destino' : 'Data e hora'
      return `${campoLabel} (${tipoLabel} • trecho ${Number(idx) + 1})`
    }
    return path
  }, [])

  const collectSchemaErrors = useCallback((): Array<{ path: string; field: string; message: string }> => {
    const payload = buildPayload()
    try {
      anexo2Schema.parse(payload)
      return []
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        const lastByPath = new Map<string, { path: string; field: string; message: string }>()
        for (const issue of issues) {
          const path = issue.path.join('.')
          lastByPath.set(path, {
            path,
            field: getFieldLabel(path),
            message: issue.message,
          })
        }
        return Array.from(lastByPath.values())
      }
      return []
    }
  }, [buildPayload, getFieldLabel])

  const openValidationModalForStep = useCallback((step: number, allErrors: Array<{ path: string; field: string; message: string }>) => {
    const currentStepPaths = getStepPaths(step)
    const stepErrors = allErrors.filter((err) =>
      currentStepPaths.some((prefix) => err.path.startsWith(prefix)),
    )
    const errorsToShow = stepErrors.length ? stepErrors : allErrors
    setValidationModal({
      open: true,
      errors: errorsToShow.map((e) => ({ field: e.field, message: e.message })),
    })
  }, [])

  const goNext = () => {
    if (validateCurrentStep()) {
      setDirection('forward')
      store.setStepValidation(store.currentStep, true)
      store.nextStep()
    } else {
      const allErrors = collectSchemaErrors()
      openValidationModalForStep(store.currentStep, allErrors)
    }
  }

  const goBack = () => {
    setDirection('backward')
    store.prevStep()
  }

  const handleGenerate = async (format: 'docx' | 'pdf') => {
    const payload = buildPayload()

    try {
      anexo2Schema.parse(payload)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        const errors = issues.map((issue) => ({
          field: getFieldLabel(issue.path.join('.')),
          message: issue.message,
        }))
        setValidationModal({ open: true, errors })
        return
      }
    }

    try {
      const previewRes = await preview.mutateAsync(payload)
      if (!previewRes.ok) {
        const backendErrors = (previewRes.issues || []).map((e: { field?: string; message: string }) => ({
          field: getFieldLabel(e.field || ''),
          message: e.message,
        }))
        setValidationModal({
          open: true,
          errors: backendErrors.length > 0
            ? backendErrors
            : [{ field: 'Erro de validação', message: 'Há erros de validação. Corrija antes de gerar.' }],
        })
        return
      }
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
      const apiErr = err as {
        body?: {
          errors?: Array<{ field: string; message: string }>
          issues?: Array<{ field: string; message: string }>
          detail?: string | Record<string, unknown>
        }
        message?: string
      }
      const rawErrors = apiErr?.body?.errors || apiErr?.body?.issues || []
      const bodyErrors = rawErrors.map((e) => ({ field: getFieldLabel(e.field), message: e.message }))
      setValidationModal({
        open: true,
        errors: bodyErrors.length > 0
          ? bodyErrors
          : [{ field: 'Erro na geração', message: err instanceof Error ? err.message : 'Não foi possível gerar o documento. Tente novamente.' }],
      })
    }
  }

  const handleImport = async (file: File) => {
    const result = await prefill.mutateAsync(file)
    if (result.prefill) {
      store.applyPayload(result.prefill as Partial<Anexo2Payload>)
      toast.success('Dados importados do documento!')
    }
    return result
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
      <WizardStepper steps={STEPS} currentStep={store.currentStep} completedSteps={completedSteps} onStepClick={(step) => {
        if (step < store.currentStep) {
          setDirection('backward')
          store.goToStep(step)
          return
        }
        if (step > store.currentStep) {
          const allErrors = collectSchemaErrors()
          for (let s = store.currentStep; s < step; s++) {
            const currentStepPaths = getStepPaths(s)
            const hasError = allErrors.some((err) =>
              currentStepPaths.some((prefix) => err.path.startsWith(prefix)),
            )
            if (hasError) {
              openValidationModalForStep(s, allErrors)
              return
            }
          }
          setDirection('forward')
          store.goToStep(step)
        }
      }} />

      <Card>
        <CardContent className="pt-5">
          <StepTransition step={store.currentStep} direction={direction}>
            {/* STEP 1 — Data */}
            {store.currentStep === 1 && (
              <Step1Data
                data={data}
                errors={stepErrors}
                onFieldChange={store.setFieldValue}
                onImport={handleImport}
                onOpenChat={() => store.setChatOpen(true)}
              />
            )}

            {/* STEP 2 — Proposto */}
            {store.currentStep === 2 && (
              <Step2Proposto
                data={data}
                errors={stepErrors}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 3 — Afastamento */}
            {store.currentStep === 3 && (
              <Step3Afastamento
                data={data}
                errors={stepErrors}
                onAddTrecho={store.addTrecho}
                onRemoveTrecho={store.removeTrecho}
                onUpdateTrecho={store.updateTrecho}
              />
            )}

            {/* STEP 4 — Atividades */}
            {store.currentStep === 4 && (
              <Step4Atividades
                data={data}
                errors={stepErrors}
                onAddAlteracao={store.addAlteracao}
                onRemoveAlteracao={store.removeAlteracao}
                onUpdateAlteracao={store.updateAlteracao}
                onAddAtividade={store.addAtividade}
                onRemoveAtividade={store.removeAtividade}
                onUpdateAtividade={store.updateAtividade}
              />
            )}

            {/* STEP 5 — Prazo */}
            {store.currentStep === 5 && (
              <Step5Prazo
                data={data}
                errors={stepErrors}
                autoFlags={store.autoFlags}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 6 — Confirmação */}
            {store.currentStep === 6 && (
              <Step6Confirmacao
                data={data}
                errors={stepErrors}
                onFieldChange={store.setFieldValue}
              />
            )}

            {/* STEP 7 — Revisão */}
            {store.currentStep === 7 && (
              <Step7Revisao
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
          {store.currentStep < 7 && (
            <WizardNavigation
              currentStep={store.currentStep}
              totalSteps={TOTAL_STEPS}
              onBack={goBack}
              onNext={goNext}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal genérico de erros de validação */}
      <ValidationErrorsModal
        open={validationModal.open}
        onClose={() => setValidationModal({ open: false, errors: [] })}
        errors={validationModal.errors}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={store.isChatOpen}
        onClose={() => store.setChatOpen(false)}
        flow={createAnexo2ChatFlow((chatData) => {
          applyChatDataToForm(chatData, store.setFieldValue)
          for (let i = 1; i <= 6; i++) store.setStepValidation(i, true)
          store.setChatOpen(false)
          store.goToStep(7)
          toast.success('Dados do assistente aplicados! Revise na tela de conferência.')
        })}
        onApply={() => store.setChatOpen(false)}
        title="Dira — Assistente Anexo II"
        externalState={store.chatState}
        setExternalState={store.setChatState}
      />
    </div>
  )
}

function getStepPaths(step: number): string[] {
  const paths: Record<number, string[]> = {
    1: ['data_relatorio'],
    2: ['proposto'],
    3: ['afastamento'],
    4: ['alteracoes_cancelamentos_noshow', 'atividades_tabela'],
    5: ['flags', 'justificativa_prestacao_contas_fora_prazo'],
    6: ['viagem_realizada'],
  }
  return paths[step] || []
}
