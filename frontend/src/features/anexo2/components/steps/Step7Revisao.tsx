import { 
  FileText, 
  Download, 
  RotateCcw, 
  User, 
  MapPin, 
  CalendarDays, 
  Scale, 
  ClipboardList, 
  FileCheck2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewSection } from '@/features/review/components/ReviewSection'
import { ReviewGrid } from '@/features/review/components/ReviewGrid'
import { ReviewRow } from '@/features/review/components/ReviewRow'
import { ReviewTimeline } from '@/features/review/components/ReviewTimeline'
import { ReviewBadge } from '@/features/review/components/ReviewBadge'
import { ReviewAlert } from '@/features/review/components/ReviewAlert'
import { maskCPF, maskPhone } from '@/lib/validators'
import { formatDateBR, formatDateTimeBR } from '@/lib/dates'
import type { Anexo2Payload } from '@/types'

interface Step7RevisaoProps {
  data: Partial<Anexo2Payload>
  autoFlags: { foraDoPrazo: boolean }
  isPending: boolean
  onGenerate: (format: 'docx' | 'pdf') => Promise<void>
  onReset: () => void
  onGoToStep: (step: number) => void
  setDirection: (dir: 'forward' | 'backward') => void
}

const ORG_LABELS: Record<string, string> = {
  cchsa: 'CCHSA',
  cavn: 'CAVN',
  projetos: 'Projetos',
  outros: 'Outros',
}

export function Step7Revisao({
  data,
  autoFlags,
  isPending,
  onGenerate,
  onReset,
  onGoToStep,
  setDirection,
}: Step7RevisaoProps) {
  const handleEdit = (step: number) => {
    setDirection('backward')
    onGoToStep(step)
  }

  const esc = (s: string | undefined) => s || ''

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Banner Resumo de Boas-vindas da Revisão */}
      <div className="bg-gradient-to-r from-[var(--color-accent)]/15 via-[var(--color-accent-2)]/5 to-transparent border border-[var(--color-accent)]/20 rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[var(--color-accent)]" />
            Resumo do Relatório de Viagem
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Por favor, revise atentamente todas as informações preenchidas antes de gerar os arquivos finais.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--color-field-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          Pronto para geração
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Relatório de Viagem */}
        <ReviewSection 
          title="Relatório de Viagem" 
          icon={<ClipboardList size={16} />}
          onEdit={() => handleEdit(1)}
          className="lg:col-span-2"
        >
          <ReviewGrid columns={3}>
            <ReviewRow label="Data do Relatório" value={formatDateBR(data.data_relatorio || '')} />
            <ReviewRow label="Viagem realizada" value={data.viagem_realizada === 'sim' ? 'Sim' : 'Não'} />
            <ReviewRow label="Status" value={
              <ReviewBadge variant={autoFlags.foraDoPrazo ? 'danger' : 'success'} label={autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'} />
            } />
          </ReviewGrid>
        </ReviewSection>

        {/* Proposto */}
        <ReviewSection 
          title="Proposto" 
          icon={<User size={16} />}
          onEdit={() => handleEdit(2)}
          className="lg:col-span-2"
        >
          <ReviewGrid columns={2}>
            <ReviewRow label="Nome completo" value={data.proposto?.nome} />
            <ReviewRow label="Cargo / Função" value={data.proposto?.cargo_funcao} />
            <ReviewRow label="CPF" value={maskCPF(data.proposto?.cpf || '')} />
            <ReviewRow label="SIAPE" value={data.proposto?.siape} />
            <ReviewRow label="Telefone" value={maskPhone(data.proposto?.telefone || '')} />
            <ReviewRow label="E-mail" value={data.proposto?.email} />
            <ReviewRow label="Órgão de exercício" value={ORG_LABELS[data.proposto?.orgao?.tipo || '']} />
            <ReviewRow label="Órgão (detalhe)" value={data.proposto?.orgao?.detalhe} />
          </ReviewGrid>
        </ReviewSection>

        {/* Afastamento */}
        <ReviewSection 
          title="Afastamento" 
          icon={<MapPin size={16} />}
          onEdit={() => handleEdit(3)}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-3 block">Ida</span>
              <ReviewTimeline items={(data.afastamento?.ida || []).map(t => ({
                content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
                meta: formatDateTimeBR(t.data_hora),
              }))} />
            </div>
            <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-3 block">Retorno</span>
              <ReviewTimeline items={(data.afastamento?.retorno || []).map(t => ({
                content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
                meta: formatDateTimeBR(t.data_hora),
              }))} />
            </div>
          </div>
        </ReviewSection>

        {/* Atividades */}
        <ReviewSection 
          title="Atividades Desenvolvidas" 
          icon={<CalendarDays size={16} />}
          onEdit={() => handleEdit(4)}
          className="lg:col-span-2"
        >
          {/* Alterações / Cancelamentos */}
          <div className="mb-6">
            <p className="text-xs font-bold text-[var(--color-subtle)] uppercase tracking-wider mb-3">Alterações / Cancelamentos / No Show</p>
            <div className="overflow-hidden border border-[var(--color-border)] rounded-[var(--radius-md)]">
              <table className="w-full text-sm border-collapse text-left bg-[var(--color-field-bg)]/20">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 text-[var(--color-muted)] font-semibold">
                    <th className="py-2.5 px-4 text-xs uppercase tracking-wider">Tipo</th>
                    <th className="py-2.5 px-4 text-xs uppercase tracking-wider">Descrição / Justificativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 text-[var(--color-text)]">
                  {(data.alteracoes_cancelamentos_noshow || []).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-2)]/10 transition-colors">
                      <td className="py-3 px-4 font-medium">{row.tipo || '—'}</td>
                      <td className="py-3 px-4 text-[var(--color-muted)]">{row.descricao || '—'}</td>
                    </tr>
                  ))}
                  {(data.alteracoes_cancelamentos_noshow || []).length === 0 && (
                    <tr>
                      <td className="py-4 px-4 text-[var(--color-subtle)]/70 italic text-center" colSpan={2}>
                        Nenhuma alteração, cancelamento ou no-show registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Descrição Detalhada */}
          <div>
            <p className="text-xs font-bold text-[var(--color-subtle)] uppercase tracking-wider mb-3">Tabela de Atividades Desenvolvidas</p>
            <div className="overflow-hidden border border-[var(--color-border)] rounded-[var(--radius-md)]">
              <table className="w-full text-sm border-collapse text-left bg-[var(--color-field-bg)]/20">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 text-[var(--color-muted)] font-semibold">
                    <th className="py-2.5 px-4 text-xs uppercase tracking-wider">Data</th>
                    <th className="py-2.5 px-4 text-xs uppercase tracking-wider">Horário</th>
                    <th className="py-2.5 px-4 text-xs uppercase tracking-wider">Cidade</th>
                    <th className="py-2.5 px-4 text-xs uppercase tracking-wider">Descrição da Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 text-[var(--color-text)]">
                  {(data.atividades_tabela || []).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-2)]/10 transition-colors">
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{esc(formatDateBR(row.data || ''))}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{esc(row.horario)}</td>
                      <td className="py-3 px-4 font-medium">{esc(row.cidade)}</td>
                      <td className="py-3 px-4 text-[var(--color-muted)] leading-relaxed">{esc(row.atividades)}</td>
                    </tr>
                  ))}
                  {(data.atividades_tabela || []).length === 0 && (
                    <tr>
                      <td className="py-4 px-4 text-[var(--color-subtle)]/70 italic text-center" colSpan={4}>
                        Nenhuma atividade registrada na tabela.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ReviewSection>

        {/* Justificativa de Prazo */}
        {autoFlags.foraDoPrazo && (
          <ReviewSection 
            title="Justificativa de Prazo" 
            icon={<Scale size={16} />}
            onEdit={() => handleEdit(5)}
            className="lg:col-span-2"
          >
            <ReviewAlert variant="warning">
              <span className="font-semibold block mb-1">Atraso na Prestação de Contas:</span>
              <p className="text-sm italic leading-relaxed">
                "{esc(data.justificativa_prestacao_contas_fora_prazo)}"
              </p>
            </ReviewAlert>
          </ReviewSection>
        )}
      </div>

      {/* Botões de Ação de Geração */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-[var(--color-border)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="primary" 
            onClick={() => onGenerate('docx')} 
            isLoading={isPending}
            className="w-full sm:w-auto h-11 px-6 shadow-md hover:shadow-lg active:scale-95 transition-all text-base font-semibold"
          >
            <FileText size={18} /> Gerar DOCX
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onGenerate('pdf')} 
            isLoading={isPending}
            className="w-full sm:w-auto h-11 px-6 shadow-md hover:shadow-lg active:scale-95 transition-all text-base font-semibold"
          >
            <Download size={18} /> Gerar PDF
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={onReset}
          className="w-full sm:w-auto text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 hover:text-[var(--color-danger)]"
        >
          <RotateCcw size={16} /> Iniciar Novo Formulário
        </Button>
      </div>

    </div>
  )
}
