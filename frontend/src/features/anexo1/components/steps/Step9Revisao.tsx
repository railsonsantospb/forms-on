import { Button } from '@/components/ui/button'
import { ReviewSection } from '@/features/review/components/ReviewSection'
import { ReviewGrid } from '@/features/review/components/ReviewGrid'
import { ReviewRow } from '@/features/review/components/ReviewRow'
import { ReviewTimeline } from '@/features/review/components/ReviewTimeline'
import { ReviewBadge } from '@/features/review/components/ReviewBadge'
import { ReviewAlert } from '@/features/review/components/ReviewAlert'
import { TP_LABELS, DEB_LABELS, TRANSP_LABELS, VINC_LABELS } from '@/features/anexo1/lib/wizardHelpers'
import { formatDateBR, formatDateTimeBR } from '@/lib/dates'
import { maskCPF, maskPhone } from '@/lib/validators'
import { 
  FileText, 
  Download, 
  RotateCcw, 
  User, 
  Landmark, 
  ShieldCheck, 
  MapPin, 
  Target, 
  Coins, 
  Scale, 
  FileCheck2, 
  ClipboardList
} from 'lucide-react'
import type { Anexo1Payload } from '@/types'

interface Step9RevisaoProps {
  data: Partial<Anexo1Payload>
  autoFlags: { foraDoPrazo: boolean; fds: boolean }
  isPending: boolean
  onGenerate: (format: 'docx' | 'pdf') => void
  onReset: () => void
  onGoToStep: (step: number) => void
  setDirection: (dir: 'backward' | 'forward') => void
}

function esc(s: string | undefined): string {
  return s || ''
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
        <div className="skeleton h-5 w-48 rounded mb-3" />
        <div className="skeleton h-3 w-72 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Step9Revisao({ data, autoFlags, isPending, onGenerate, onReset, onGoToStep, setDirection }: Step9RevisaoProps) {
  const handleEdit = (step: number) => {
    setDirection('backward')
    onGoToStep(step)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {isPending ? (
        <ReviewSkeleton />
      ) : (
        <>
          {/* Banner Resumo de Boas-vindas da Revisão */}
          <div className="bg-gradient-to-r from-[var(--color-accent)]/15 via-[var(--color-accent-2)]/5 to-transparent border border-[var(--color-accent)]/20 rounded-[var(--radius-lg)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[var(--color-accent)]" />
                Resumo da Requisição
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

          {/* Grid de Seções */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Solicitação */}
            <ReviewSection 
              title="Solicitação" 
              icon={<ClipboardList size={16} />}
              onEdit={() => handleEdit(1)}
              className="lg:col-span-2"
            >
              <ReviewGrid columns={3}>
                <ReviewRow label="Tipo" value={TP_LABELS[data.tipo_solicitacao || '']} />
                <ReviewRow label="Data" value={formatDateBR(data.data_solicitacao || '')} />
                <ReviewRow label="Status" value={
                  <ReviewBadge variant={autoFlags.foraDoPrazo ? 'danger' : 'success'} label={autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'} />
                } />
              </ReviewGrid>
            </ReviewSection>

            {/* Servidor */}
            <ReviewSection 
              title="Servidor" 
              icon={<User size={16} />}
              onEdit={() => handleEdit(2)}
              className="lg:col-span-2"
            >
              <ReviewGrid columns={2}>
                <ReviewRow label="Nome" value={data.servidor?.nome_completo} />
                <ReviewRow label="Cargo / Função" value={data.servidor?.cargo_funcao} />
                <ReviewRow label="CPF" value={maskCPF(data.servidor?.cpf || '')} />
                <ReviewRow label="RG" value={data.servidor?.rg} />
                <ReviewRow label="Data de nascimento" value={formatDateBR(data.servidor?.data_nascimento || '')} />
                <ReviewRow label="SIAPE" value={data.servidor?.siape} />
                <ReviewRow label="Nome da mãe" value={data.servidor?.nome_mae} />
                <ReviewRow label="Endereço" value={data.servidor?.endereco} />
                <ReviewRow label="Telefone" value={maskPhone(data.servidor?.telefone || '')} />
                <ReviewRow label="E-mail" value={data.servidor?.email} />
                <ReviewRow label="Tipo de vínculo" value={VINC_LABELS[data.servidor?.tipo_vinculo || '']} />
                <ReviewRow label="Especificar vínculo" value={data.servidor?.vinculo_outro_especificar} />
                <ReviewRow label="Passaporte" value={data.servidor?.passaporte} />
                <ReviewRow label="Lotação / Órgão" value={data.servidor?.lotacao_orgao} />
              </ReviewGrid>
            </ReviewSection>

            {/* Dados Bancários */}
            <ReviewSection 
              title="Dados Bancários" 
              icon={<Landmark size={16} />}
              onEdit={() => handleEdit(2)}
            >
              <ReviewGrid columns={3}>
                <ReviewRow label="Banco" value={data.servidor?.dados_bancarios?.banco} />
                <ReviewRow label="Agência" value={data.servidor?.dados_bancarios?.agencia} />
                <ReviewRow label="Conta" value={data.servidor?.dados_bancarios?.conta} />
              </ReviewGrid>
            </ReviewSection>

            {/* Auxílios */}
            <ReviewSection 
              title="Auxílios" 
              icon={<ShieldCheck size={16} />}
              onEdit={() => handleEdit(2)}
            >
              <ReviewGrid columns={2}>
                <ReviewRow label="Auxílio transporte" value={data.servidor?.auxilio_transporte?.recebe ? `Sim — ${data.servidor.auxilio_transporte.valor || ''}` : 'Não'} />
                <ReviewRow label="Auxílio alimentação" value={data.servidor?.auxilio_alimentacao?.recebe ? `Sim — ${data.servidor.auxilio_alimentacao.valor || ''}` : 'Não'} />
              </ReviewGrid>
            </ReviewSection>

            {/* Trechos de Viagem */}
            <ReviewSection 
              title="Trechos de Viagem" 
              icon={<MapPin size={16} />}
              onEdit={() => handleEdit(3)}
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
                  <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-3 block">Ida</span>
                  <ReviewTimeline items={(data.trechos?.ida || []).map(t => ({
                    content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
                    meta: formatDateTimeBR(t.data_hora),
                  }))} />
                </div>
                <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
                  <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-3 block">Retorno</span>
                  <ReviewTimeline items={(data.trechos?.retorno || []).map(t => ({
                    content: `De ${esc(t.origem)} a ${esc(t.destino)}`,
                    meta: formatDateTimeBR(t.data_hora),
                  }))} />
                </div>
              </div>
            </ReviewSection>

            {/* Missão e Motivo */}
            <ReviewSection 
              title="Missão e Motivo" 
              icon={<Target size={16} />}
              onEdit={() => handleEdit(5)}
              className="lg:col-span-2"
            >
              <ReviewGrid columns={3}>
                <ReviewRow label="Início da Missão" value={formatDateTimeBR(data.missao?.inicio_data_hora || '')} />
                <ReviewRow label="Término da Missão" value={formatDateTimeBR(data.missao?.termino_data_hora || '')} />
                <ReviewRow label="Meio de Transporte" value={data.transporte?.meios?.map(m => TRANSP_LABELS[m]).join(', ') || '—'} />
              </ReviewGrid>
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <ReviewRow label="Motivo da viagem" value={<span className="whitespace-pre-wrap leading-relaxed text-sm block bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)]">{data.motivo_viagem}</span>} fullWidth />
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <ReviewRow label="Relação de pertinência" value={<span className="whitespace-pre-wrap leading-relaxed text-sm block bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)]">{data.relacao_pertinencia}</span>} fullWidth />
              </div>
            </ReviewSection>

            {/* Recurso e Condições */}
            <ReviewSection 
              title="Recurso e Condições" 
              icon={<Coins size={16} />}
              onEdit={() => handleEdit(7)}
            >
              <ReviewGrid columns={3}>
                <ReviewRow label="Recurso" value={DEB_LABELS[data.debito_recurso?.tipo || '']} />
                <ReviewRow label="Detalhe" value={data.debito_recurso?.detalhe} />
                <ReviewRow label="Distância" value={data.transporte?.distancia_km ? `${data.transporte.distancia_km} km` : '—'} />
              </ReviewGrid>
              {data.transporte?.termo_veiculo_proprio_ciente && (
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                  <ReviewRow label="Termo veículo próprio" value={
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-success)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 px-2 py-1 rounded-md">
                      <ShieldCheck size={12} /> Ciente dos Termos
                    </span>
                  } />
                </div>
              )}
            </ReviewSection>

            {/* Condições Especiais */}
            <ReviewSection 
              title="Condições Especiais" 
              icon={<Scale size={16} />}
              onEdit={() => handleEdit(8)}
            >
              <ReviewGrid columns={2}>
                <ReviewRow label="Fim de Semana/Feriado" value={data.flags?.envolve_fds_feriado_ou_dia_anterior ? 'Sim' : 'Não'} />
                <ReviewRow label="Fora do prazo" value={data.flags?.fora_do_prazo ? 'Sim' : 'Não'} />
              </ReviewGrid>
            </ReviewSection>

            {/* Justificativas */}
            <ReviewSection 
              title="Justificativas Obrigatórias" 
              icon={<FileCheck2 size={16} />}
              onEdit={() => handleEdit(8)}
              className="lg:col-span-2"
            >
              <div className="space-y-4">
                {data.flags?.fora_do_prazo && (
                  <ReviewRow label="Fora do prazo" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.justificativa_fora_prazo}</p>} fullWidth />
                )}
                {data.flags?.envolve_fds_feriado_ou_dia_anterior && (
                  <ReviewRow label="Fim de Semana/Feriado/Dia anterior" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.justificativa_fds_feriado_dia_anterior}</p>} fullWidth />
                )}
                {data.justificativas?.just_viagem_urgente?.trim() && (
                  <ReviewRow label="Viagem urgente" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.just_viagem_urgente}</p>} fullWidth />
                )}
                {data.justificativas?.just_fds_feriado?.trim() && (
                  <ReviewRow label="Fim de Semana/Feriado (documento)" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.just_fds_feriado}</p>} fullWidth />
                )}
                {data.justificativas?.just_aeroporto?.trim() && (
                  <ReviewRow label="Especificação de aeroporto" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.just_aeroporto}</p>} fullWidth />
                )}
                {data.justificativas?.just_grupo_mais_2?.trim() && (
                  <ReviewRow label="Grupo de mais de 2 pessoas" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.just_grupo_mais_2}</p>} fullWidth />
                )}
                {data.justificativas?.just_grupo_mais_5?.trim() && (
                  <ReviewRow label="Grupo de mais de 5 pessoas" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.just_grupo_mais_5}</p>} fullWidth />
                )}
                {data.justificativas?.just_mais_30_diarias?.trim() && (
                  <ReviewRow label="Mais de 30 diárias acumuladas" value={<p className="text-sm bg-[var(--color-background)]/50 border border-[var(--color-border)] p-3 rounded-[var(--radius-sm)] leading-relaxed">{data.justificativas?.just_mais_30_diarias}</p>} fullWidth />
                )}
                {!data.flags?.fora_do_prazo && !data.flags?.envolve_fds_feriado_ou_dia_anterior && 
                 !data.justificativas?.just_viagem_urgente?.trim() && !data.justificativas?.just_fds_feriado?.trim() &&
                 !data.justificativas?.just_aeroporto?.trim() && !data.justificativas?.just_grupo_mais_2?.trim() &&
                 !data.justificativas?.just_grupo_mais_5?.trim() && !data.justificativas?.just_mais_30_diarias?.trim() && (
                  <span className="text-sm text-[var(--color-subtle)]/70 italic">Nenhuma justificativa especial necessária para esta viagem.</span>
                )}
              </div>
            </ReviewSection>
          </div>

          {/* Alertas */}
          {autoFlags.foraDoPrazo && (
            <ReviewAlert variant="warning">
              Esta solicitação está fora do prazo regulamentar. Por favor, verifique se a justificativa inserida descreve detalhadamente o interesse da administração na viagem para evitar rejeição.
            </ReviewAlert>
          )}

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
        </>
      )}
    </div>
  )
}
