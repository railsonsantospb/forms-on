import { useMemo, useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAnexo2WizardStore } from '../store/useAnexo2WizardStore'
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
import { createAnexo2ChatFlow } from '@/features/anexo2/lib/chatFlow'
import { applyChatDataToForm } from '@/features/chat/lib/applyChatData'
import { useAnexo2Preview, useAnexo2Generate, useAnexo2Prefill } from '@/api/anexo2'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { formatDateBR, formatDateTimeBR, daysDiff, todayISO } from '@/lib/dates'
import { maskCPF, maskPhone, onlyDigits } from '@/lib/validators'
import { anexo2Schema } from '@/features/anexo2/schemas/anexo2.schema'
import type { Anexo2Payload } from '@/types'
import { MessageCircle, FileText, Download, Plus, X, RotateCcw } from 'lucide-react'

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

const ORG_LABELS: Record<string, string> = {
  cchsa: 'CCHSA',
  cavn: 'CAVN',
  projetos: 'Projetos',
  outros: 'Outros',
}

export function Anexo2Wizard() {
  const store = useAnexo2WizardStore()
  const preview = useAnexo2Preview()
  const generate = useAnexo2Generate()
  const prefill = useAnexo2Prefill()
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})

  const data = store.formData

  // Auto-save
  const { restore, clear } = useAutoSave<Partial<Anexo2Payload>>('ufpb-wizard-anexo2-v3', data)
  useBeforeUnload(true)

  useEffect(() => {
    const saved = restore()
    if (saved) {
      store.applyPayload(saved)
      toast.info('Rascunho anterior restaurado do navegador')
    }
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

  // Atualiza flags automaticamente quando chega no step de prazo
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
      alteracoes_cancelamentos_noshow: data.alteracoes_cancelamentos_noshow || [],
      atividades_tabela: data.atividades_tabela,
      flags: data.flags,
      justificativa_prestacao_contas_fora_prazo: data.justificativa_prestacao_contas_fora_prazo,
      viagem_realizada: (data.viagem_realizada as 'sim' | 'nao') || 'sim',
    }
  }, [data])

  // Limpa erros automaticamente quando o usuário corrige os campos
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
    let errors: Record<string, string> = {}

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

  const goNext = () => {
    if (validateCurrentStep()) {
      setDirection('forward')
      store.setStepValidation(store.currentStep, true)
      store.nextStep()
    } else {
      toast.error('Corrija os erros antes de avançar')
    }
  }

  const goBack = () => {
    setDirection('backward')
    store.prevStep()
  }

  const handleGenerate = async (format: 'docx' | 'pdf') => {
    const payload = buildPayload()
    const previewRes = await preview.mutateAsync(payload)
    if (!previewRes.ok) {
      toast.error('Há erros de validação. Corrija antes de gerar.')
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
      <WizardStepper steps={STEPS} currentStep={store.currentStep} completedSteps={completedSteps} onStepClick={(step) => { setDirection(step < store.currentStep ? 'backward' : 'forward'); store.goToStep(step) }} />

      <Card>
        <CardContent className="pt-5">
          <StepTransition step={store.currentStep} direction={direction}>
            {/* STEP 1 */}
            {store.currentStep === 1 && (
              <div className="space-y-4">
                <DocumentImport onImport={handleImport} label="Importar de Anexo I preenchido" />
                <FormField label="Data do relatório" error={stepErrors['data_relatorio']} required>
                  <Input type="date" value={data.data_relatorio} onChange={(e) => store.setFieldValue('data_relatorio', e.target.value)} />
                </FormField>
              </div>
            )}

            {/* STEP 2 */}
            {store.currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Nome completo" error={stepErrors['proposto.nome']} required>
                    <Input value={data.proposto?.nome || ''} onChange={(e) => store.setFieldValue('proposto.nome', e.target.value)} />
                  </FormField>
                  <FormField label="CPF" error={stepErrors['proposto.cpf']} required>
                    <Input value={maskCPF(data.proposto?.cpf || '')} onChange={(e) => store.setFieldValue('proposto.cpf', onlyDigits(e.target.value))} placeholder="000.000.000-00" />
                  </FormField>
                  <FormField label="SIAPE" error={stepErrors['proposto.siape']} required>
                    <Input value={data.proposto?.siape || ''} onChange={(e) => store.setFieldValue('proposto.siape', onlyDigits(e.target.value))} placeholder="Somente números" />
                  </FormField>
                  <FormField label="Cargo/Função">
                    <Input value={data.proposto?.cargo_funcao || ''} onChange={(e) => store.setFieldValue('proposto.cargo_funcao', e.target.value)} />
                  </FormField>
                  <FormField label="Telefone" error={stepErrors['proposto.telefone']}>
                    <Input value={maskPhone(data.proposto?.telefone || '')} onChange={(e) => store.setFieldValue('proposto.telefone', onlyDigits(e.target.value))} placeholder="(00) 00000-0000" />
                  </FormField>
                  <FormField label="E-mail" error={stepErrors['proposto.email']}>
                    <Input value={data.proposto?.email || ''} onChange={(e) => store.setFieldValue('proposto.email', e.target.value)} placeholder="email@exemplo.com" />
                  </FormField>
                </div>
                <div className="border-t border-[var(--color-border)] pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Órgão de exercício" error={stepErrors['proposto.orgao.tipo']} required>
                      <Select value={data.proposto?.orgao?.tipo || 'cchsa'} onChange={(e) => store.setFieldValue('proposto.orgao.tipo', e.target.value)}>
                        <option value="cchsa">CCHSA</option>
                        <option value="cavn">CAVN</option>
                        <option value="projetos">Projetos</option>
                        <option value="outros">Outros</option>
                      </Select>
                    </FormField>
                    {(data.proposto?.orgao?.tipo === 'projetos' || data.proposto?.orgao?.tipo === 'outros') && (
                      <FormField label="Detalhe" error={stepErrors['proposto.orgao.detalhe']} required>
                        <Input value={data.proposto?.orgao?.detalhe || ''} onChange={(e) => store.setFieldValue('proposto.orgao.detalhe', e.target.value)} />
                      </FormField>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Afastamento */}
            {store.currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Trechos de ida</h4>
                  <TrechosList
                    trechos={data.afastamento?.ida || []}
                    onAdd={() => store.addTrecho('ida')}
                    onRemove={(i) => store.removeTrecho('ida', i)}
                    onUpdate={(i, f, v) => store.updateTrecho('ida', i, f, v)}
                    errors={stepErrors}
                    prefix="afastamento.ida"
                  />
                </div>
                <div className="border-t border-[var(--color-border)] pt-4">
                  <h4 className="text-sm font-semibold mb-3">Trechos de retorno</h4>
                  <TrechosList
                    trechos={data.afastamento?.retorno || []}
                    onAdd={() => store.addTrecho('retorno')}
                    onRemove={(i) => store.removeTrecho('retorno', i)}
                    onUpdate={(i, f, v) => store.updateTrecho('retorno', i, f, v)}
                    errors={stepErrors}
                    prefix="afastamento.retorno"
                  />
                </div>
              </div>
            )}

            {/* STEP 4 — Atividades */}
            {store.currentStep === 4 && (
              <div className="space-y-4">
                <div className="border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Alterações / Cancelamentos / No Show</h4>
                    <Button variant="ghost" size="sm" onClick={() => store.addAlteracao()}>
                      <Plus size={14} /> Adicionar linha
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-[var(--color-subtle)] text-xs uppercase">
                          <th className="text-left py-2 px-2">Tipo</th>
                          <th className="text-left py-2 px-2">Descrição</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.alteracoes_cancelamentos_noshow || []).map((row, i) => (
                          <tr key={i} className="border-b border-[var(--color-border)]/50">
                            <td className="py-1 px-1">
                              <Select value={row.tipo || ''} onChange={(e) => store.updateAlteracao(i, 'tipo', e.target.value)} className="text-xs py-1.5">
                                <option value="">Selecione</option>
                                <option value="Alteração">Alteração</option>
                                <option value="Cancelamento">Cancelamento</option>
                                <option value="No Show">No Show</option>
                                <option value="Outro">Outro</option>
                              </Select>
                            </td>
                            <td className="py-1 px-1"><Input value={row.descricao || ''} onChange={(e) => store.updateAlteracao(i, 'descricao', e.target.value)} className="text-xs py-1.5" /></td>
                            <td className="py-1 px-1">
                              <button onClick={() => store.removeAlteracao(i)} className="text-[var(--color-danger)] hover:opacity-80"><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(data.alteracoes_cancelamentos_noshow || []).length === 0 && (
                    <p className="text-xs text-[var(--color-danger)] mt-1">Nenhuma alteração registrada.</p>
                  )}
                </div>

                <div className="border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Tabela de atividades</h4>
                    <Button variant="ghost" size="sm" onClick={() => store.addAtividade()}>
                      <Plus size={14} /> Adicionar linha
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-[var(--color-subtle)] text-xs uppercase">
                          <th className="text-left py-2 px-2">Data</th>
                          <th className="text-left py-2 px-2">Horário</th>
                          <th className="text-left py-2 px-2">Cidade</th>
                          <th className="text-left py-2 px-2">Atividades *</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.atividades_tabela || []).map((row, i) => (
                          <tr key={i} className="border-b border-[var(--color-border)]/50">
                            <td className="py-1 px-1"><Input value={row.data || ''} onChange={(e) => store.updateAtividade(i, 'data', e.target.value)} className="text-xs py-1.5" /></td>
                            <td className="py-1 px-1"><Input value={row.horario || ''} onChange={(e) => store.updateAtividade(i, 'horario', e.target.value)} className="text-xs py-1.5" /></td>
                            <td className="py-1 px-1"><Input value={row.cidade || ''} onChange={(e) => store.updateAtividade(i, 'cidade', e.target.value)} className="text-xs py-1.5" /></td>
                            <td className="py-1 px-1"><Input value={row.atividades || ''} onChange={(e) => store.updateAtividade(i, 'atividades', e.target.value)} className="text-xs py-1.5" placeholder="Obrigatório" /></td>
                            <td className="py-1 px-1">
                              <button onClick={() => store.removeAtividade(i)} className="text-[var(--color-danger)] hover:opacity-80"><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stepErrors['atividades_tabela'] && (
                    <p className="text-xs text-[var(--color-danger)] mt-1">{stepErrors['atividades_tabela']}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5 — Prazo */}
            {store.currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-2)]">
                  <Badge variant={store.autoFlags.foraDoPrazo ? 'danger' : 'success'}>
                    {store.autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'}
                  </Badge>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer opacity-70">
                    <input type="checkbox" checked={data.flags?.prestacao_contas_fora_prazo || false} disabled className="w-4 h-4" />
                    <span className="text-sm">Prestação de contas fora do prazo (calculado automaticamente)</span>
                  </label>
                  {data.flags?.prestacao_contas_fora_prazo && (
                    <div className="mt-2">
                      <FormField label="Justificativa" error={stepErrors['justificativa_prestacao_contas_fora_prazo']} required>
                        <Textarea value={data.justificativa_prestacao_contas_fora_prazo || ''} onChange={(e) => store.setFieldValue('justificativa_prestacao_contas_fora_prazo', e.target.value)} />
                      </FormField>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 6 — Confirmação */}
            {store.currentStep === 6 && (
              <div className="space-y-4">
                <FormField label="A viagem foi realizada?" error={stepErrors['viagem_realizada']} required>
                  <Select value={data.viagem_realizada || 'sim'} onChange={(e) => store.setFieldValue('viagem_realizada', e.target.value)}>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </Select>
                </FormField>
                {data.viagem_realizada === 'nao' && (
                  <ReviewAlert variant="danger">
                    <strong>Atenção:</strong> A viagem não foi realizada. No campo "Atividades desenvolvidas" (passo anterior), descreva o motivo da não realização.
                  </ReviewAlert>
                )}
              </div>
            )}

            {/* STEP 7 — Review */}
            {store.currentStep === 7 && (
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
                    {[1, 2, 3, 4, 5, 6].map((s) => (
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
        title="Assistente — Anexo II"
      />

      {/* Chat button */}
      <button
        onClick={() => store.setChatOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center hover:bg-[var(--color-accent)]/90 transition-colors z-40"
        title="Assistente virtual"
      >
        <MessageCircle size={20} />
      </button>
    </div>
  )
}

/* ===== Helpers ===== */

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

/* ===== Sub-components ===== */

function TrechosList({ trechos, onAdd, onRemove, onUpdate, errors, prefix }: {
  trechos: { origem: string; destino: string; data_hora: string }[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: string, value: string) => void
  errors: Record<string, string>
  prefix: string
}) {
  return (
    <div className="space-y-3">
      {trechos.map((t, i) => (
        <div key={i} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Trecho {i + 1}</span>
            {trechos.length > 1 && (
              <button onClick={() => onRemove(i)} className="text-[var(--color-danger)] hover:opacity-80"><X size={14} /></button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FormField label="Origem (Cidade/UF) *" error={errors[`${prefix}.${i}.origem`]}>
              <Input value={t.origem} onChange={(e) => onUpdate(i, 'origem', e.target.value)} placeholder="João Pessoa/PB" />
            </FormField>
            <FormField label="Destino (Cidade/UF) *" error={errors[`${prefix}.${i}.destino`]}>
              <Input value={t.destino} onChange={(e) => onUpdate(i, 'destino', e.target.value)} placeholder="Recife/PE" />
            </FormField>
            <div className="col-span-full">
              <FormField label="Data e hora" error={errors[`${prefix}.${i}.data_hora`]}>
                <Input type="datetime-local" value={t.data_hora?.slice(0, 16) || ''} onChange={(e) => onUpdate(i, 'data_hora', e.target.value ? e.target.value + ':00' : '')} />
              </FormField>
            </div>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}><Plus size={14} /> Adicionar trecho</Button>
    </div>
  )
}

function renderReview(data: Partial<Anexo2Payload>, autoFlags: { foraDoPrazo: boolean }) {
  const esc = (s: string | undefined) => s || '—'

  return (
    <div className="space-y-1.5">
      <ReviewSection title="Relatório de Viagem">
        <ReviewGrid columns={3}>
          <ReviewRow label="Data" value={formatDateBR(data.data_relatorio || '')} />
          <ReviewRow label="Viagem realizada" value={data.viagem_realizada === 'sim' ? 'Sim' : 'Não'} />
          <ReviewRow label="Status" value={
            <ReviewBadge variant={autoFlags.foraDoPrazo ? 'danger' : 'success'} label={autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'} />
          } />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Proposto">
        <ReviewGrid>
          <ReviewRow label="Nome" value={data.proposto?.nome} />
          <ReviewRow label="Cargo" value={data.proposto?.cargo_funcao} />
          <ReviewRow label="CPF" value={maskCPF(data.proposto?.cpf || '')} />
          <ReviewRow label="SIAPE" value={data.proposto?.siape} />
          <ReviewRow label="Telefone" value={maskPhone(data.proposto?.telefone || '')} />
          <ReviewRow label="E-mail" value={data.proposto?.email} />
          <ReviewRow label="Órgão" value={ORG_LABELS[data.proposto?.orgao?.tipo || '']} fullWidth />
          <ReviewRow label="Órgão (detalhe)" value={data.proposto?.orgao?.detalhe} fullWidth />
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection title="Afastamento">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wide mb-1 block">Ida</span>
            <ReviewTimeline items={(data.afastamento?.ida || []).map(t => ({
              content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
              meta: formatDateTimeBR(t.data_hora),
            }))} />
          </div>
          <div>
            <span className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wide mb-1 block">Retorno</span>
            <ReviewTimeline items={(data.afastamento?.retorno || []).map(t => ({
              content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
              meta: formatDateTimeBR(t.data_hora),
            }))} />
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title="Atividades">
        <div className="mt-2 pt-2 border-t border-[var(--color-border)] overflow-x-auto">
          <p className="text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wide mb-2">Alterações / Cancelamentos / No Show</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-subtle)]">
                <th className="text-left py-2 px-2">Tipo</th>
                <th className="text-left py-2 px-2">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {(data.alteracoes_cancelamentos_noshow || []).map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50">
                  <td className="py-2 px-2">{row.tipo || '—'}</td>
                  <td className="py-2 px-2">{row.descricao || '—'}</td>
                </tr>
              ))}
              {(data.alteracoes_cancelamentos_noshow || []).length === 0 && (
                <tr>
                  <td className="py-2 px-2 text-[var(--color-subtle)]" colSpan={2}>Nenhuma alteração registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--color-border)] overflow-x-auto">
          <h4 className="text-sm font-semibold mb-2">DESCRIÇÃO DA VIAGEM:</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-subtle)]">
                <th className="text-left py-2 px-2">Data</th>
                <th className="text-left py-2 px-2">Horário</th>
                <th className="text-left py-2 px-2">Cidade</th>
                <th className="text-left py-2 px-2">Atividades</th>
              </tr>
            </thead>
            <tbody>
              {(data.atividades_tabela || []).map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50">
                  <td className="py-2 px-2">{row.data || '—'}</td>
                  <td className="py-2 px-2">{row.horario || '—'}</td>
                  <td className="py-2 px-2">{row.cidade || '—'}</td>
                  <td className="py-2 px-2">{row.atividades || '—'}</td>
                </tr>
              ))}
              {(data.atividades_tabela || []).length === 0 && (
                <tr>
                  <td className="py-2 px-2 text-[var(--color-subtle)]" colSpan={4}>Nenhuma atividade na tabela</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ReviewSection>

      <ReviewSection title="Prazo">
        <ReviewGrid columns={2}>
          <ReviewRow label="Prestação fora do prazo" value={data.flags?.prestacao_contas_fora_prazo ? 'Sim' : 'Não'} />
          <ReviewRow label="Justificativa" value={data.justificativa_prestacao_contas_fora_prazo} fullWidth />
        </ReviewGrid>
      </ReviewSection>

      {data.viagem_realizada === 'nao' && (
        <ReviewAlert variant="danger">
          <strong>Atenção:</strong> Viagem não realizada. Verifique se o motivo foi devidamente descrito nas atividades.
        </ReviewAlert>
      )}
    </div>
  )
}
