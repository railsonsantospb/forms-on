import { useMemo, useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ValidationErrorsModal } from '@/components/ui/modal'
import { useAnexo1WizardStore, defaultFormData as anexo1DefaultFormData } from '../store/useAnexo1WizardStore'
import { WizardStepper } from '@/components/wizard/WizardStepper'
import { WizardNavigation } from '@/components/wizard/WizardNavigation'
import { StepTransition } from '@/components/wizard/StepTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { DocumentImport } from '@/features/import/components/DocumentImport'
import { ReviewSection } from '@/features/review/components/ReviewSection'
import { ReviewGrid } from '@/features/review/components/ReviewGrid'
import { ReviewRow } from '@/features/review/components/ReviewRow'
import { ReviewTimeline } from '@/features/review/components/ReviewTimeline'
import { ReviewBadge } from '@/features/review/components/ReviewBadge'
import { ReviewAlert } from '@/features/review/components/ReviewAlert'
import { ChatModal } from '@/features/chat/components/ChatModal'
import { createAnexo1ChatFlow } from '@/features/anexo1/lib/chatFlow'
import { applyChatDataToForm } from '@/features/chat/lib/applyChatData'
import { useAnexo1Preview, useAnexo1Generate, useAnexo1Prefill } from '@/api/anexo1'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { isEquivalentToDefault } from '@/lib/object-utils'

import { formatDateBR, formatDateTimeBR, isWeekend, daysDiff, todayISO } from '@/lib/dates'
import { maskCPF, maskPhone, onlyDigits } from '@/lib/validators'
import { anexo1Schema } from '@/features/anexo1/schemas/anexo1.schema'
import type { Anexo1Payload } from '@/types'
import { MessageCircle, FileText, Download, Plus, X, RotateCcw } from 'lucide-react'

const TOTAL_STEPS = 9

const STEPS = [
  { number: 1, title: 'Tipo', subtitle: 'Define o prazo automaticamente (10 dias sem passagens; 30 dias com passagens).' },
  { number: 2, title: 'Servidor', subtitle: 'Dados pessoais e bancários.' },
  { number: 3, title: 'Ida', subtitle: 'Origem, destino e data/hora de partida.' },
  { number: 4, title: 'Retorno', subtitle: 'Origem, destino e data/hora de retorno.' },
  { number: 5, title: 'Missão', subtitle: 'Início e término da missão oficial.' },
  { number: 6, title: 'Motivo', subtitle: 'Descrição do objetivo e relação de pertinência.' },
  { number: 7, title: 'Recurso', subtitle: 'Fonte de recursos e meios de transporte.' },
  { number: 8, title: 'Justificativas', subtitle: 'Condições especiais e justificativas obrigatórias.' },
  { number: 9, title: 'Revisão', subtitle: 'Revise o resumo e gere o documento.' },
]

const TP_LABELS: Record<string, string> = {
  diarias: 'Diárias',
  passagens: 'Passagens',
  diarias_e_passagens: 'Diárias e Passagens',
}

const DEB_LABELS: Record<string, string> = {
  cchsa: 'CCHSA',
  cavn: 'CAVN',
  projeto: 'Projeto',
  outros: 'Outros',
}

const TRANSP_LABELS: Record<string, string> = {
  veiculo_oficial: 'Veículo Oficial',
  empresa_terrestre: 'Empresa Terrestre',
  empresa_aerea: 'Empresa Aérea',
  veiculo_proprio: 'Veículo Próprio',
}

export function Anexo1Wizard() {
  const store = useAnexo1WizardStore()
  const preview = useAnexo1Preview()
  const generate = useAnexo1Generate()
  const prefill = useAnexo1Prefill()
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [trechoModal, setTrechoModal] = useState<{ open: boolean; errors: string[] }>({ open: false, errors: [] })
  const [validationModal, setValidationModal] = useState<{ open: boolean; errors: Array<{ field: string; message: string }> }>({ open: false, errors: [] })

  const data = store.formData

  // Auto-save
  const { restore, clear } = useAutoSave<Partial<Anexo1Payload>>('ufpb-wizard-anexo1', data)
  useBeforeUnload(true) // sempre avisa, já que não temos dirty check exato

  // Restore on mount
  useEffect(() => {
    const doRestore = async () => {
      const saved = await restore()
      if (saved) {
        if (!isEquivalentToDefault(saved as Record<string, unknown>, anexo1DefaultFormData as Record<string, unknown>)) {
          store.applyPayload(saved)
          toast.info('Rascunho anterior restaurado do navegador')
        } else {
          clear() // Limpa rascunho vazio do sessionStorage
        }
      }
    }
    doRestore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAutoFlags = useCallback(() => {
    const tipo = data.tipo_solicitacao || 'diarias'
    const prazoDias = tipo === 'passagens' ? 30 : 10
    const dataSolic = data.data_solicitacao || todayISO()

    let fds = false
    let foraPrazo = false

    if (data.trechos?.ida?.[0]?.data_hora) {
      const idaDate = data.trechos.ida[0].data_hora.slice(0, 10)
      fds = isWeekend(idaDate)
      const diff = daysDiff(dataSolic, idaDate)
      foraPrazo = diff < prazoDias
    }

    store.setAutoFlags({ foraDoPrazo: foraPrazo, fds })

    if (foraPrazo && !data.flags?.fora_do_prazo) {
      store.setFieldValue('flags.fora_do_prazo', true)
    }
    if (fds && !data.flags?.envolve_fds_feriado_ou_dia_anterior) {
      store.setFieldValue('flags.envolve_fds_feriado_ou_dia_anterior', true)
    }
  }, [data, store])

  // Refresh auto flags when entering step 8
  useEffect(() => {
    if (store.currentStep === 8) {
      refreshAutoFlags()
    }
  }, [store.currentStep, refreshAutoFlags])

  // Sincroniza justificativas automáticas com campos do documento
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
    // Garante que auxílio transporte/alimentação tenham `recebe` definido (schema exige)
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
      relacao_pertinencia: data.relacao_pertinencia,
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

  // Limpa erros automaticamente quando o usuário corrige os campos
  // Mantém apenas os erros do step atual para não poluir a interface com erros futuros
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
          // Só mostra erros do step atual
          if (currentPaths.some((prefix) => path.startsWith(prefix))) {
            newErrors[path] = issue.message
          }
        }
        setStepErrors(newErrors)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, store.currentStep])

  // Validação por step — retorna boolean e os erros do step atual (síncrono)
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
          // Separa apenas os erros do step atual
          if (currentStepPaths.some((prefix) => path.startsWith(prefix))) {
            currentStepErrors[path] = issue.message
          }
        }
      }
      // Exibe apenas os erros do step atual na interface
      setStepErrors(currentStepErrors)
      return { valid: Object.keys(currentStepErrors).length === 0, currentErrors: currentStepErrors }
    }
  }, [buildPayload, store.currentStep])

  const goNext = () => {
    const { valid, currentErrors } = validateCurrentStep()
    if (valid) {
      setDirection('forward')
      store.setStepValidation(store.currentStep, true)
      store.nextStep()
    } else {
      // Só mostra modal de trechos se o usuário está nos steps de trecho (3 ou 4)
      // e há erros de trecho no step atual
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

    // 1) Preview/validação no backend
    let previewRes: { ok: boolean; errors?: Array<{ field: string; message: string }>; issues?: Array<{ field: string; message: string }> }
    try {
      previewRes = await preview.mutateAsync(payload)
    } catch (err: unknown) {
      // Se for erro 422 do validate_payload, o body pode conter os erros
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

    // 2) Geração do documento
    try {
      const { blob, filename } = await generate.mutateAsync({ format, payload })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Documento ${format.toUpperCase()} gerado com sucesso!`)
      clear() // Limpa rascunho após gerar
    } catch (err: unknown) {
      setValidationModal({
        open: true,
        errors: [{ field: 'Erro na geração', message: err instanceof Error ? err.message : 'Não foi possível gerar o documento. Tente novamente.' }],
      })
    }
  }

  const handleImport = async (file: File) => {
    const result = await prefill.mutateAsync(file)
    if (result.prefill) {
      store.applyPayload(result.prefill as Partial<Anexo1Payload>)
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
      <WizardStepper steps={STEPS} currentStep={store.currentStep} completedSteps={completedSteps} onStepClick={(step) => { setDirection(step < store.currentStep ? 'backward' : 'forward'); store.goToStep(step) }} />

      <Card>
        <CardContent className="pt-5">
          <StepTransition step={store.currentStep} direction={direction}>
            {/* STEP 1 */}
            {store.currentStep === 1 && (
              <div className="space-y-4">
                <button
                  onClick={() => store.setChatOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all z-40"
                  title="Assistente virtual"
                >
                  <MessageCircle size={20} />
                  <span>Dira — Assistente virtual — Preencher conversando</span>
                </button>
                <DocumentImport onImport={handleImport} />
                <FormField label="Tipo de solicitação" error={stepErrors['tipo_solicitacao']} required>
                  <Select value={data.tipo_solicitacao} onChange={(e) => store.setFieldValue('tipo_solicitacao', e.target.value)}>
                    <option value="diarias">Diárias</option>
                    <option value="passagens">Passagens</option>
                    <option value="diarias_e_passagens">Diárias e Passagens</option>
                  </Select>
                </FormField>
                <FormField label="Data da solicitação" error={stepErrors['data_solicitacao']} required>
                  <Input type="date" value={data.data_solicitacao} onChange={(e) => store.setFieldValue('data_solicitacao', e.target.value)} />
                </FormField>
              </div>
            )}

            {/* STEP 2 */}
            {store.currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Nome completo" error={stepErrors['servidor.nome_completo']} required>
                    <Input value={data.servidor?.nome_completo || ''} onChange={(e) => store.setFieldValue('servidor.nome_completo', e.target.value)} />
                  </FormField>
                  <FormField label="Cargo/Função" error={stepErrors['servidor.cargo_funcao']} required>
                    <Input value={data.servidor?.cargo_funcao || ''} onChange={(e) => store.setFieldValue('servidor.cargo_funcao', e.target.value)} />
                  </FormField>
                  <FormField label="CPF" error={stepErrors['servidor.cpf']} required>
                    <Input value={maskCPF(data.servidor?.cpf || '')} onChange={(e) => store.setFieldValue('servidor.cpf', onlyDigits(e.target.value))} placeholder="000.000.000-00" />
                  </FormField>
                  <FormField label="RG" error={stepErrors['servidor.rg']} required>
                    <Input value={data.servidor?.rg || ''} onChange={(e) => store.setFieldValue('servidor.rg', e.target.value)} />
                  </FormField>
                  <FormField label="Data de nascimento" error={stepErrors['servidor.data_nascimento']} required>
                    <Input type="date" value={data.servidor?.data_nascimento || ''} onChange={(e) => store.setFieldValue('servidor.data_nascimento', e.target.value)} />
                  </FormField>
                  <FormField label="SIAPE" error={stepErrors['servidor.siape']} required>
                    <Input value={data.servidor?.siape || ''} onChange={(e) => store.setFieldValue('servidor.siape', onlyDigits(e.target.value))} placeholder="Somente números" />
                  </FormField>
                  <FormField label="Nome da mãe" error={stepErrors['servidor.nome_mae']} required className="sm:col-span-2">
                    <Input value={data.servidor?.nome_mae || ''} onChange={(e) => store.setFieldValue('servidor.nome_mae', e.target.value)} />
                  </FormField>
                  <FormField label="Endereço completo" error={stepErrors['servidor.endereco']} required className="sm:col-span-2">
                    <Input value={data.servidor?.endereco || ''} onChange={(e) => store.setFieldValue('servidor.endereco', e.target.value)} />
                  </FormField>
                  <FormField label="Telefone" error={stepErrors['servidor.telefone']} required>
                    <Input value={maskPhone(data.servidor?.telefone || '')} onChange={(e) => store.setFieldValue('servidor.telefone', onlyDigits(e.target.value))} placeholder="(00) 00000-0000" />
                  </FormField>
                  <FormField label="E-mail" error={stepErrors['servidor.email']} required>
                    <Input value={data.servidor?.email || ''} onChange={(e) => store.setFieldValue('servidor.email', e.target.value)} placeholder="email@exemplo.com" />
                  </FormField>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4 mt-2">
                  <h4 className="text-sm font-semibold mb-3">Dados bancários</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Banco" error={stepErrors['servidor.dados_bancarios.banco']} required>
                      <Input value={data.servidor?.dados_bancarios?.banco || ''} onChange={(e) => store.setFieldValue('servidor.dados_bancarios.banco', e.target.value)} />
                    </FormField>
                    <FormField label="Agência" error={stepErrors['servidor.dados_bancarios.agencia']} required>
                      <Input value={data.servidor?.dados_bancarios?.agencia || ''} onChange={(e) => store.setFieldValue('servidor.dados_bancarios.agencia', onlyDigits(e.target.value))} placeholder="Somente números" />
                    </FormField>
                    <FormField label="Conta" error={stepErrors['servidor.dados_bancarios.conta']} required>
                      <Input value={data.servidor?.dados_bancarios?.conta || ''} onChange={(e) => store.setFieldValue('servidor.dados_bancarios.conta', onlyDigits(e.target.value))} placeholder="Somente números" />
                    </FormField>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4">
                  <h4 className="text-sm font-semibold mb-3">Informações adicionais</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tipo de vínculo" error={stepErrors['servidor.tipo_vinculo']} required>
                      <Select value={data.servidor?.tipo_vinculo || ''} onChange={(e) => store.setFieldValue('servidor.tipo_vinculo', e.target.value)}>
                        <option value="">Selecione...</option>
                        <option value="servidor">Servidor</option>
                        <option value="nao_servidor">Não Servidor</option>
                        <option value="sepe">SEPE</option>
                        <option value="acompanhante_pcd">Acompanhante PCD</option>
                        <option value="outro">Outro</option>
                      </Select>
                    </FormField>
                    {data.servidor?.tipo_vinculo === 'outro' && (
                      <FormField label="Especificar vínculo" error={stepErrors['servidor.vinculo_outro_especificar']} required>
                        <Input value={data.servidor?.vinculo_outro_especificar || ''} onChange={(e) => store.setFieldValue('servidor.vinculo_outro_especificar', e.target.value)} />
                      </FormField>
                    )}

                    {/* Auxílios — apenas para SEPE */}
                    {data.servidor?.tipo_vinculo === 'sepe' && (
                      <>
                        <div className="sm:col-span-2">
                          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)]">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={data.servidor?.auxilio_transporte?.recebe || false}
                                onChange={(e) => store.setFieldValue('servidor.auxilio_transporte.recebe', e.target.checked)}
                                className="w-4 h-4 accent-[var(--color-accent)]"
                              />
                              <span className="text-sm font-medium">Recebe Auxílio Transporte</span>
                            </label>
                            {data.servidor?.auxilio_transporte?.recebe && (
                              <FormField label="Valor" className="mt-2">
                                <Input
                                  value={data.servidor?.auxilio_transporte?.valor || ''}
                                  onChange={(e) => store.setFieldValue('servidor.auxilio_transporte.valor', e.target.value)}
                                  placeholder="R$ 0,00"
                                />
                              </FormField>
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)]">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                              <input
                                type="checkbox"
                                checked={data.servidor?.auxilio_alimentacao?.recebe || false}
                                onChange={(e) => store.setFieldValue('servidor.auxilio_alimentacao.recebe', e.target.checked)}
                                className="w-4 h-4 accent-[var(--color-accent)]"
                              />
                              <span className="text-sm font-medium">Recebe Auxílio Alimentação</span>
                            </label>
                            {data.servidor?.auxilio_alimentacao?.recebe && (
                              <FormField label="Valor" className="mt-2">
                                <Input
                                  value={data.servidor?.auxilio_alimentacao?.valor || ''}
                                  onChange={(e) => store.setFieldValue('servidor.auxilio_alimentacao.valor', e.target.value)}
                                  placeholder="R$ 0,00"
                                />
                              </FormField>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <FormField label="Passaporte">
                      <Input value={data.servidor?.passaporte || ''} onChange={(e) => store.setFieldValue('servidor.passaporte', e.target.value)} placeholder="Se for viagem internacional" />
                    </FormField>
                    <FormField label="Lotação/Órgão">
                      <Input value={data.servidor?.lotacao_orgao || ''} onChange={(e) => store.setFieldValue('servidor.lotacao_orgao', e.target.value)} />
                    </FormField>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 & 4 — Trechos */}
            {(store.currentStep === 3 || store.currentStep === 4) && (
              <TrechosStep
                type={store.currentStep === 3 ? 'ida' : 'retorno'}
                trechos={data.trechos?.[store.currentStep === 3 ? 'ida' : 'retorno'] || []}
                onAdd={() => store.addTrecho(store.currentStep === 3 ? 'ida' : 'retorno')}
                onRemove={(i) => store.removeTrecho(store.currentStep === 3 ? 'ida' : 'retorno', i)}
                onUpdate={(i, field, value) => store.updateTrecho(store.currentStep === 3 ? 'ida' : 'retorno', i, field, value)}
                errors={stepErrors}
              />
            )}

            {/* STEP 5 — Missão */}
            {store.currentStep === 5 && (
              <div className="space-y-4">
                <FormField label="Início da missão" error={stepErrors['missao.inicio_data_hora']} required>
                  <Input type="datetime-local" value={data.missao?.inicio_data_hora?.slice(0, 16) || ''} onChange={(e) => store.setFieldValue('missao.inicio_data_hora', e.target.value ? e.target.value + ':00' : '')} />
                </FormField>
                <FormField label="Término da missão" error={stepErrors['missao.termino_data_hora']} required>
                  <Input type="datetime-local" value={data.missao?.termino_data_hora?.slice(0, 16) || ''} onChange={(e) => store.setFieldValue('missao.termino_data_hora', e.target.value ? e.target.value + ':00' : '')} />
                </FormField>
              </div>
            )}

            {/* STEP 6 — Motivo */}
            {store.currentStep === 6 && (
              <div className="space-y-4">
                <FormField label="Motivo da viagem" error={stepErrors['motivo_viagem']} required>
                  <Textarea value={data.motivo_viagem || ''} onChange={(e) => store.setFieldValue('motivo_viagem', e.target.value)} rows={5} placeholder="Mínimo 20 caracteres" />
                </FormField>
                <FormField label="Relação de pertinência">
                  <Textarea value={data.relacao_pertinencia || ''} onChange={(e) => store.setFieldValue('relacao_pertinencia', e.target.value)} rows={3} />
                </FormField>
              </div>
            )}

            {/* STEP 7 — Recurso e Transporte */}
            {store.currentStep === 7 && (
              <div className="space-y-4">
                <FormField label="Débito em recurso" error={stepErrors['debito_recurso.tipo']} required>
                  <Select value={data.debito_recurso?.tipo || 'cchsa'} onChange={(e) => {
                    const newType = e.target.value
                    store.setFieldValue('debito_recurso.tipo', newType)
                    if (!['projeto', 'outros'].includes(newType)) {
                      store.setFieldValue('debito_recurso.detalhe', '')
                    }
                  }}>
                    <option value="cchsa">CCHSA</option>
                    <option value="cavn">CAVN</option>
                    <option value="projeto">Projeto</option>
                    <option value="outros">Outros</option>
                  </Select>
                </FormField>
                {(data.debito_recurso?.tipo === 'projeto' || data.debito_recurso?.tipo === 'outros') && (
                  <FormField label="Detalhe" error={stepErrors['debito_recurso.detalhe']} required>
                    <Input value={data.debito_recurso?.detalhe || ''} onChange={(e) => store.setFieldValue('debito_recurso.detalhe', e.target.value)} />
                  </FormField>
                )}

                <div className="border-t border-[var(--color-border)] pt-4">
                  <FormField label="Meios de transporte" error={stepErrors['transporte.meios']} required>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(TRANSP_LABELS).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)] cursor-pointer hover:bg-[var(--color-btn-hover)] transition-colors">
                          <input
                            type="checkbox"
                            checked={data.transporte?.meios?.includes(key as 'veiculo_oficial')}
                            onChange={() => store.toggleTransporte(key)}
                            className="w-4 h-4 accent-[var(--color-accent)]"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>

                {data.transporte?.meios?.includes('veiculo_proprio') && (
                  <div className="space-y-3 p-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.transporte?.termo_veiculo_proprio_ciente || false}
                        onChange={(e) => store.setFieldValue('transporte.termo_veiculo_proprio_ciente', e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-accent)]"
                      />
                      <span className="text-sm">Declaro estar ciente do termo de responsabilidade para uso de veículo próprio</span>
                    </label>
                    <FormField label="Distância (km)">
                      <Input value={data.transporte?.distancia_km || ''} onChange={(e) => store.setFieldValue('transporte.distancia_km', e.target.value)} />
                    </FormField>
                  </div>
                )}
              </div>
            )}

            {/* STEP 8 — Justificativas */}
            {store.currentStep === 8 && (
              <div className="space-y-4">

                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-2)]">
                  <Badge variant={store.autoFlags.foraDoPrazo ? 'danger' : 'success'}>
                    {store.autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'}
                  </Badge>
                  <Badge variant={store.autoFlags.fds ? 'warning' : 'success'}>
                    {store.autoFlags.fds ? 'Fim de Semana/Feriado' : 'Sem Fim de Semana'}
                  </Badge>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={data.flags?.envolve_fds_feriado_ou_dia_anterior || false} onChange={(e) => store.setFieldValue('flags.envolve_fds_feriado_ou_dia_anterior', e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm">Envolve fim de semana, feriado ou dia anterior</span>
                  </label>
                  {data.flags?.envolve_fds_feriado_ou_dia_anterior && (
                    <div className="mt-2">
                      <FormField label="Justificativa Fim de Semana/Feriado" error={stepErrors['justificativas.justificativa_fds_feriado_dia_anterior']} required>
                        <Textarea value={data.justificativas?.justificativa_fds_feriado_dia_anterior || ''} onChange={(e) => store.setFieldValue('justificativas.justificativa_fds_feriado_dia_anterior', e.target.value)} />
                      </FormField>
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer opacity-70">
                    <input type="checkbox" checked={data.flags?.fora_do_prazo || false} disabled className="w-4 h-4" />
                    <span className="text-sm">Fora do prazo (calculado automaticamente)</span>
                  </label>
                  {data.flags?.fora_do_prazo && (
                    <div className="mt-2">
                      <FormField label="Justificativa fora do prazo" error={stepErrors['justificativas.justificativa_fora_prazo']} required>
                        <Textarea value={data.justificativas?.justificativa_fora_prazo || ''} onChange={(e) => store.setFieldValue('justificativas.justificativa_fora_prazo', e.target.value)} />
                      </FormField>
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--color-border)] pt-4 mt-2">
                  <p className="text-sm font-semibold mb-3">
                    Justificativas adicionais
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mb-3">
                    Passagens e/ou diárias com qualquer uma das características abaixo somente serão emitidas mediante justificativa. Justifique todos os itens nos quais se enquadre a solicitação.
                  </p>
                  <div className="space-y-4">
                    <JustificativaCheckbox
                      label="Viagem urgente (menos de 20 dias de antecedência)"
                      checked={!!data.justificativas?.just_viagem_urgente}
                      value={data.justificativas?.just_viagem_urgente || ''}
                      onToggle={() => store.setFieldValue('justificativas.just_viagem_urgente', data.justificativas?.just_viagem_urgente ? '' : ' ')}
                      onChange={(v) => store.setFieldValue('justificativas.just_viagem_urgente', v)}
                      error={stepErrors['justificativas.just_viagem_urgente']}
                    />
                    <JustificativaCheckbox
                      label="Final de semana, feriado ou iniciada na sexta-feira"
                      checked={!!data.justificativas?.just_fds_feriado}
                      value={data.justificativas?.just_fds_feriado || ''}
                      onToggle={() => store.setFieldValue('justificativas.just_fds_feriado', data.justificativas?.just_fds_feriado ? '' : ' ')}
                      onChange={(v) => store.setFieldValue('justificativas.just_fds_feriado', v)}
                      error={stepErrors['justificativas.just_fds_feriado']}
                    />
                    <JustificativaCheckbox
                      label="Especificação de aeroporto"
                      checked={!!data.justificativas?.just_aeroporto}
                      value={data.justificativas?.just_aeroporto || ''}
                      onToggle={() => store.setFieldValue('justificativas.just_aeroporto', data.justificativas?.just_aeroporto ? '' : ' ')}
                      onChange={(v) => store.setFieldValue('justificativas.just_aeroporto', v)}
                      error={stepErrors['justificativas.just_aeroporto']}
                    />
                    <JustificativaCheckbox
                      label="Grupo de mais de 2 pessoas"
                      checked={!!data.justificativas?.just_grupo_mais_2}
                      value={data.justificativas?.just_grupo_mais_2 || ''}
                      onToggle={() => store.setFieldValue('justificativas.just_grupo_mais_2', data.justificativas?.just_grupo_mais_2 ? '' : ' ')}
                      onChange={(v) => store.setFieldValue('justificativas.just_grupo_mais_2', v)}
                      error={stepErrors['justificativas.just_grupo_mais_2']}
                    />
                    <JustificativaCheckbox
                      label="Grupo de mais de 5 pessoas (competência do Dirigente máximo da UFPB autorizar)"
                      checked={!!data.justificativas?.just_grupo_mais_5}
                      value={data.justificativas?.just_grupo_mais_5 || ''}
                      onToggle={() => store.setFieldValue('justificativas.just_grupo_mais_5', data.justificativas?.just_grupo_mais_5 ? '' : ' ')}
                      onChange={(v) => store.setFieldValue('justificativas.just_grupo_mais_5', v)}
                      error={stepErrors['justificativas.just_grupo_mais_5']}
                    />
                    <JustificativaCheckbox
                      label="Viagem com mais de 30 diárias acumuladas no exercício (competência do Dirigente máximo da UFPB autorizar)"
                      checked={!!data.justificativas?.just_mais_30_diarias}
                      value={data.justificativas?.just_mais_30_diarias || ''}
                      onToggle={() => store.setFieldValue('justificativas.just_mais_30_diarias', data.justificativas?.just_mais_30_diarias ? '' : ' ')}
                      onChange={(v) => store.setFieldValue('justificativas.just_mais_30_diarias', v)}
                      error={stepErrors['justificativas.just_mais_30_diarias']}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 9 — Review */}
            {store.currentStep === 9 && (
              <div>
                {renderReview(data, store.autoFlags)}

                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                  <Button variant="primary" onClick={() => handleGenerate('docx')} isLoading={generate.isPending}>
                    <FileText size={16} /> Gerar DOCX
                  </Button>
                  <Button variant="secondary" onClick={() => handleGenerate('pdf')} isLoading={generate.isPending}>
                    <Download size={16} /> Gerar PDF
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    <RotateCcw size={16} /> Novo formulário
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-muted)] mb-3">Precisa corrigir alguma informação?</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setDirection('backward'); store.goToStep(s) }}
                        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                      >
                        {STEPS[s - 1].title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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

/* ===== Helpers ===== */

function getStepPaths(step: number): string[] {
  const paths: Record<number, string[]> = {
    1: ['tipo_solicitacao', 'data_solicitacao'],
    2: ['servidor'],
    3: ['trechos.ida'],
    4: ['trechos.retorno'],
    5: ['missao'],
    6: ['motivo_viagem', 'relacao_pertinencia'],
    7: ['debito_recurso', 'transporte'],
    8: ['flags', 'justificativas'],
  }
  return paths[step] || []
}

/* ===== Mapeamento de caminhos de erro para nomes amigáveis ===== */

function getFieldLabel(path: string): string {
  const FIELD_LABELS: Record<string, string> = {
    'tipo_solicitacao': 'Tipo de solicitação',
    'data_solicitacao': 'Data da solicitação',
    'servidor.nome_completo': 'Nome completo',
    'servidor.cargo_funcao': 'Cargo/Função',
    'servidor.cpf': 'CPF',
    'servidor.rg': 'RG',
    'servidor.data_nascimento': 'Data de nascimento',
    'servidor.siape': 'SIAPE',
    'servidor.nome_mae': 'Nome da mãe',
    'servidor.endereco': 'Endereço completo',
    'servidor.telefone': 'Telefone',
    'servidor.email': 'E-mail',
    'servidor.tipo_vinculo': 'Tipo de vínculo',
    'servidor.vinculo_outro_especificar': 'Especificar vínculo',
    'servidor.dados_bancarios.banco': 'Banco',
    'servidor.dados_bancarios.agencia': 'Agência',
    'servidor.dados_bancarios.conta': 'Conta',
    'servidor.passaporte': 'Passaporte',
    'servidor.lotacao_orgao': 'Lotação/Órgão',
    'servidor.auxilio_transporte.recebe': 'Recebe Auxílio Transporte',
    'servidor.auxilio_transporte.valor': 'Valor do Auxílio Transporte',
    'servidor.auxilio_alimentacao.recebe': 'Recebe Auxílio Alimentação',
    'servidor.auxilio_alimentacao.valor': 'Valor do Auxílio Alimentação',
    'missao.inicio_data_hora': 'Início da missão',
    'missao.termino_data_hora': 'Término da missão',
    'motivo_viagem': 'Motivo da viagem',
    'relacao_pertinencia': 'Relação de pertinência',
    'debito_recurso.tipo': 'Débito em recurso',
    'debito_recurso.detalhe': 'Detalhe do recurso',
    'transporte.meios': 'Meios de transporte',
    'transporte.termo_veiculo_proprio_ciente': 'Termo de veículo próprio',
    'transporte.distancia_km': 'Distância (km)',
    'flags.envolve_fds_feriado_ou_dia_anterior': 'Envolve fim de semana/feriado',
    'flags.fora_do_prazo': 'Fora do prazo',
    'justificativas.justificativa_fora_prazo': 'Justificativa fora do prazo',
    'justificativas.justificativa_fds_feriado_dia_anterior': 'Justificativa fim de semana/feriado',
    'justificativas.just_viagem_urgente': 'Justificativa viagem urgente',
    'justificativas.just_fds_feriado': 'Justificativa fim de semana/feriado (documento)',
    'justificativas.just_aeroporto': 'Justificativa especificação de aeroporto',
    'justificativas.just_grupo_mais_2': 'Justificativa grupo de mais de 2 pessoas',
    'justificativas.just_grupo_mais_5': 'Justificativa grupo de mais de 5 pessoas',
    'justificativas.just_mais_30_diarias': 'Justificativa mais de 30 diárias acumuladas',
  }

  // Verifica match exato primeiro
  if (FIELD_LABELS[path]) return FIELD_LABELS[path]

  // Tenta extrair índice de array para trechos: trechos.ida.0.origem
  const trechoMatch = path.match(/^trechos\.(ida|retorno)\.(\d+)\.(origem|destino|data_hora)$/)
  if (trechoMatch) {
    const [, tipo, idx, campo] = trechoMatch
    const tipoLabel = tipo === 'ida' ? 'Ida' : 'Retorno'
    const campoLabel = campo === 'data_hora' ? 'Data e hora' : campo.charAt(0).toUpperCase() + campo.slice(1)
    return `Trecho de ${tipoLabel} ${Number(idx) + 1} — ${campoLabel}`
  }

  // Fallback: retorna o próprio path formatado
  return path
    .replace(/\./g, ' › ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ===== Sub-components ===== */

function JustificativaCheckbox({ label, checked, value, onToggle, onChange, error }: {
  label: string
  checked: boolean
  value: string
  onToggle: () => void
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 mt-0.5 accent-[var(--color-accent)]"
        />
        <span className="text-sm">{label}</span>
      </label>
      {checked && (
        <div className="ml-6">
          <FormField label="Justificativa" error={error}>
            <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="Informe a justificativa..." />
          </FormField>
        </div>
      )}
    </div>
  )
}

function TrechosStep({ type, trechos, onAdd, onRemove, onUpdate, errors }: {
  type: 'ida' | 'retorno'
  trechos: { origem: string; destino: string; data_hora: string }[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: string, value: string) => void
  errors: Record<string, string>
}) {
  const prefix = `trechos.${type}`
  return (
    <div className="space-y-4">
      {trechos.map((t, i) => (
        <div key={i} className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Trecho {i + 1}</span>
            {trechos.length > 1 && (
              <button onClick={() => onRemove(i)} className="text-[var(--color-danger)] hover:opacity-80 transition-opacity">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Origem (Cidade/UF) *" error={errors[`${prefix}.${i}.origem`]}>
              <Input value={t.origem} onChange={(e) => onUpdate(i, 'origem', e.target.value)} placeholder="João Pessoa/PB" />
            </FormField>
            <FormField label="Destino (Cidade/UF) *" error={errors[`${prefix}.${i}.destino`]}>
              <Input value={t.destino} onChange={(e) => onUpdate(i, 'destino', e.target.value)} placeholder="Recife/PE" />
            </FormField>
            <div className="col-span-full">
              <FormField label="Data e hora *" error={errors[`${prefix}.${i}.data_hora`]}>
                <Input type="datetime-local" value={t.data_hora?.slice(0, 16) || ''} onChange={(e) => onUpdate(i, 'data_hora', e.target.value ? e.target.value + ':00' : '')} />
              </FormField>
            </div>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}>
        <Plus size={14} /> Adicionar trecho de {type}
      </Button>
    </div>
  )
}

function renderReview(data: Partial<Anexo1Payload>, autoFlags: { foraDoPrazo: boolean; fds: boolean }) {
  const esc = (s: string | undefined) => s || '—'
  const VINC_LABELS: Record<string, string> = {
    servidor: 'Servidor',
    nao_servidor: 'Não Servidor',
    sepe: 'SEPE',
    acompanhante_pcd: 'Acompanhante PCD',
    outro: 'Outro',
  }

  return (
    <div className="space-y-1.5">
      <ReviewSection title="Solicitação">
        <ReviewGrid columns={3}>
          <ReviewRow label="Tipo" value={TP_LABELS[data.tipo_solicitacao || '']} />
          <ReviewRow label="Data" value={formatDateBR(data.data_solicitacao || '')} />
          <ReviewRow label="Status" value={
            <ReviewBadge variant={autoFlags.foraDoPrazo ? 'danger' : 'success'} label={autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'} />
          } />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Servidor">
        <ReviewGrid>
          <ReviewRow label="Nome" value={data.servidor?.nome_completo} />
          <ReviewRow label="Cargo" value={data.servidor?.cargo_funcao} />
          <ReviewRow label="CPF" value={maskCPF(data.servidor?.cpf || '')} />
          <ReviewRow label="RG" value={data.servidor?.rg} />
          <ReviewRow label="Data de nascimento" value={formatDateBR(data.servidor?.data_nascimento || '')} />
          <ReviewRow label="SIAPE" value={data.servidor?.siape} />
          <ReviewRow label="Nome da mãe" value={data.servidor?.nome_mae} />
          <ReviewRow label="Endereço" value={data.servidor?.endereco} />
          <ReviewRow label="Telefone" value={maskPhone(data.servidor?.telefone || '')} />
          <ReviewRow label="E-mail" value={data.servidor?.email} />
          <ReviewRow label="Tipo de vínculo" value={VINC_LABELS[data.servidor?.tipo_vinculo || '']} />
          <ReviewRow label="Vínculo (especificar)" value={data.servidor?.vinculo_outro_especificar} />
          <ReviewRow label="Passaporte" value={data.servidor?.passaporte} />
          <ReviewRow label="Lotação/Órgão" value={data.servidor?.lotacao_orgao} />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Dados Bancários">
        <ReviewGrid columns={3}>
          <ReviewRow label="Banco" value={data.servidor?.dados_bancarios?.banco} />
          <ReviewRow label="Agência" value={data.servidor?.dados_bancarios?.agencia} />
          <ReviewRow label="Conta" value={data.servidor?.dados_bancarios?.conta} />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Auxílios">
        <ReviewGrid columns={2}>
          <ReviewRow label="Auxílio transporte" value={data.servidor?.auxilio_transporte?.recebe ? `Sim — ${data.servidor.auxilio_transporte.valor || ''}` : 'Não'} />
          <ReviewRow label="Auxílio alimentação" value={data.servidor?.auxilio_alimentacao?.recebe ? `Sim — ${data.servidor.auxilio_alimentacao.valor || ''}` : 'Não'} />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Trechos de Viagem">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wide mb-1 block">Ida</span>
            <ReviewTimeline items={(data.trechos?.ida || []).map(t => ({
              content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
              meta: formatDateTimeBR(t.data_hora),
            }))} />
          </div>
          <div>
            <span className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wide mb-1 block">Retorno</span>
            <ReviewTimeline items={(data.trechos?.retorno || []).map(t => ({
              content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
              meta: formatDateTimeBR(t.data_hora),
            }))} />
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title="Missão e Motivo">
        <ReviewGrid columns={3}>
          <ReviewRow label="Início" value={formatDateTimeBR(data.missao?.inicio_data_hora || '')} />
          <ReviewRow label="Término" value={formatDateTimeBR(data.missao?.termino_data_hora || '')} />
          <ReviewRow label="Transporte" value={data.transporte?.meios?.map(m => TRANSP_LABELS[m]).join(', ') || '—'} />
        </ReviewGrid>
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
          <ReviewRow label="Motivo" value={<span className="whitespace-pre-wrap leading-relaxed">{data.motivo_viagem}</span>} fullWidth />
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
          <ReviewRow label="Pertinência" value={<span className="whitespace-pre-wrap leading-relaxed">{data.relacao_pertinencia}</span>} fullWidth />
        </div>
      </ReviewSection>

      <ReviewSection title="Recurso e Condições">
        <ReviewGrid columns={3}>
          <ReviewRow label="Recurso" value={DEB_LABELS[data.debito_recurso?.tipo || '']} />
          <ReviewRow label="Detalhe" value={data.debito_recurso?.detalhe} />
          <ReviewRow label="Distância" value={data.transporte?.distancia_km ? `${data.transporte.distancia_km} km` : '—'} />
        </ReviewGrid>
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
          <ReviewRow label="Termo veículo próprio" value={data.transporte?.termo_veiculo_proprio_ciente ? 'Ciente' : '—'} />
        </div>
      </ReviewSection>

      <ReviewSection title="Condições e Justificativas">
        <ReviewGrid columns={2}>
          <ReviewRow label="Fim de Semana/Feriado" value={data.flags?.envolve_fds_feriado_ou_dia_anterior ? 'Sim' : 'Não'} />
          <ReviewRow label="Fora do prazo" value={data.flags?.fora_do_prazo ? 'Sim' : 'Não'} />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Justificativas">
        {data.flags?.fora_do_prazo && (
          <ReviewRow label="Fora do prazo" value={data.justificativas?.justificativa_fora_prazo} fullWidth />
        )}
        {data.flags?.envolve_fds_feriado_ou_dia_anterior && (
          <ReviewRow label="Fim de Semana/Feriado/Dia anterior" value={data.justificativas?.justificativa_fds_feriado_dia_anterior} fullWidth />
        )}
        {data.justificativas?.just_viagem_urgente?.trim() && (
          <ReviewRow label="Viagem urgente" value={data.justificativas?.just_viagem_urgente} fullWidth />
        )}
        {data.justificativas?.just_fds_feriado?.trim() && (
          <ReviewRow label="Fim de Semana/Feriado (documento)" value={data.justificativas?.just_fds_feriado} fullWidth />
        )}
        {data.justificativas?.just_aeroporto?.trim() && (
          <ReviewRow label="Especificação de aeroporto" value={data.justificativas?.just_aeroporto} fullWidth />
        )}
        {data.justificativas?.just_grupo_mais_2?.trim() && (
          <ReviewRow label="Grupo de mais de 2 pessoas" value={data.justificativas?.just_grupo_mais_2} fullWidth />
        )}
        {data.justificativas?.just_grupo_mais_5?.trim() && (
          <ReviewRow label="Grupo de mais de 5 pessoas" value={data.justificativas?.just_grupo_mais_5} fullWidth />
        )}
        {data.justificativas?.just_mais_30_diarias?.trim() && (
          <ReviewRow label="Mais de 30 diárias acumuladas" value={data.justificativas?.just_mais_30_diarias} fullWidth />
        )}
      </ReviewSection>

      {autoFlags.foraDoPrazo && (
        <ReviewAlert variant="warning">
          <strong>Atenção:</strong> Esta solicitação está fora do prazo. Certifique-se de que a justificativa está completa antes de gerar o documento.
        </ReviewAlert>
      )}
    </div>
  )
}
