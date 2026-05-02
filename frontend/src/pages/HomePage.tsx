import { Link } from 'react-router-dom'
import {
  FileText,
  ClipboardCheck,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  CalendarDays,
  ShieldCheck,
  Printer,
} from 'lucide-react'

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="py-10">
        <div className="flex flex-col items-center text-center gap-5">
          <img
            src="/brasao.png"
            alt="UFPB"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
          />

          <div className="max-w-xl">
            <h1 className="text-xl sm:text-2xl font-bold mb-2 leading-snug">
              Preenchimento inteligente de formulários de diárias
            </h1>
            <p className="text-[var(--color-muted)] text-sm sm:text-base leading-relaxed">
              O sistema verifica automaticamente todas as informações, avisa sobre prazos e
              requisitos obrigatórios e gera documentos prontos em DOCX ou PDF com um único
              clique.
            </p>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnexoCard
          to="/anexo1"
          icon={<FileText size={28} className="text-[var(--color-accent)]" />}
          title="Anexo I — Requisição de Viagem"
          description="Solicitação de diárias e/ou passagens com dados do servidor, trechos, missão, motivo e justificativas."
          badge="9 passos"
        />
        <AnexoCard
          to="/anexo2"
          icon={<ClipboardCheck size={28} className="text-[var(--color-success)]" />}
          title="Anexo II — Relatório de Viagem"
          description="Relatório pós-viagem com atividades desenvolvidas, confirmação de realização e prestação de contas."
          badge="7 passos"
        />
      </section>

      {/* Como funciona */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-6 text-center">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-[var(--color-muted)]">
          <Step number={1} text="Preencha o formulário passo a passo com validação automática" />
          <Step number={2} text="Revise o resumo gerado automaticamente antes de finalizar" />
          <Step number={3} text="Baixe o documento em DOCX (Word) ou PDF pronto para assinar" />
        </div>
      </section>

      {/* Informações importantes */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-6 text-center">Informações importantes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoCard
            icon={<Clock size={20} className="text-[var(--color-accent)]" />}
            title="Prazos"
            text="A solicitação de diárias deve ser enviada com antecedência mínima de 10 dias úteis antes do início da viagem."
          />
          <InfoCard
            icon={<AlertTriangle size={20} className="text-[var(--color-warning)]" />}
            title="Requisitos obrigatórios"
            text="É necessário informar a missão oficial, motivo detalhado, trechos de ida e volta, e dados bancários atualizados."
          />
          <InfoCard
            icon={<CheckCircle2 size={20} className="text-[var(--color-success)]" />}
            title="Validação automática"
            text="O sistema verifica campos obrigatórios, formatos de data, valores e alerta sobre inconsistências em tempo real."
          />
          <InfoCard
            icon={<FileCheck size={20} className="text-[var(--color-accent)]" />}
            title="Documentos gerados"
            text="Os documentos seguem o padrão oficial da UFPB e estão prontos para assinatura digital ou impressão."
          />
          <InfoCard
            icon={<CalendarDays size={20} className="text-[var(--color-accent-2)]" />}
            title="Relatório pós-viagem"
            text="O Anexo II deve ser preenchido em até 5 dias úteis após o retorno da viagem, com descrição das atividades."
          />
          <InfoCard
            icon={<ShieldCheck size={20} className="text-[var(--color-success)]" />}
            title="Segurança e privacidade"
            text="Seus dados são processados localmente no navegador. Nenhuma informação pessoal é enviada para servidores externos."
          />
        </div>
      </section>

      {/* Dicas de preenchimento */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-6 text-center">Dicas de preenchimento</h2>
        <div className="space-y-4">
          <TipItem
            icon={<Printer size={18} className="text-[var(--color-accent)]" />}
            title="Tenha os documentos em mãos"
            text="CPF, matrícula SIAPE, dados bancários (banco, agência, conta), e o número do processo SEI, se houver."
          />
          <TipItem
            icon={<FileText size={18} className="text-[var(--color-accent)]" />}
            title="Descreva a missão com clareza"
            text="A missão deve ser objetiva e relacionada às atividades institucionais. Evite termos genéricos como 'reunião' sem contexto."
          />
          <TipItem
            icon={<CalendarDays size={18} className="text-[var(--color-accent)]" />}
            title="Datas e trechos"
            text="Informe corretamente as datas de ida e retorno. Para passagens aéreas, informe os aeroportos de origem e destino."
          />
          <TipItem
            icon={<CheckCircle2 size={18} className="text-[var(--color-success)]" />}
            title="Revise antes de gerar"
            text="Use a tela de revisão para confirmar todos os dados. Documentos com erros podem ser recusados pela administração."
          />
        </div>
      </section>
    </div>
  )
}

function AnexoCard({
  to,
  icon,
  title,
  description,
  badge,
}: {
  to: string
  icon: React.ReactNode
  title: string
  description: string
  badge: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] hover:border-[var(--color-accent)]/40 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/10">{icon}</div>
        <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[var(--color-surface-2)] text-[var(--color-subtle)]">
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1 group-hover:text-[var(--color-accent)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)]">
        Iniciar <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-base font-bold flex items-center justify-center">
        {number}
      </span>
      <span className="leading-relaxed max-w-[220px]">{text}</span>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-btn-bg)] border border-[var(--color-border)]">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function TipItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg bg-[var(--color-accent)]/10">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-0.5">{title}</h3>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
