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
  Lock,
} from 'lucide-react'

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="py-10 animate-in fade-in duration-300">
        <div className="flex flex-col items-center text-center gap-5">
          <img
            src="/brasao.png"
            alt="UFPB"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
          />

          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-3 leading-tight">
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
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
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
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8 animate-in fade-in duration-300">
        <h2 className="text-lg font-semibold mb-6 text-center">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-[var(--color-muted)]">
          <Step number={1} text="Preencha o formulário passo a passo com validação automática" />
          <Step number={2} text="Revise o resumo gerado automaticamente antes de finalizar" />
          <Step number={3} text="Baixe o documento em DOCX (Word) ou PDF pronto para assinar" />
        </div>
      </section>

      {/* Informações importantes */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8 animate-in fade-in duration-300">
        <h2 className="text-lg font-semibold mb-6 text-center">Informações importantes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoCard
            icon={<Clock size={20} className="text-[var(--color-accent)]" />}
            title="Prazos"
            text="A solicitação de diárias deve ser enviada com antecedência mínima de 10 dias antes do início da viagem."
            delay="100ms"
          />
          <InfoCard
            icon={<AlertTriangle size={20} className="text-[var(--color-warning)]" />}
            title="Requisitos obrigatórios"
            text="É necessário informar a missão oficial, motivo detalhado, trechos de ida e volta, e dados bancários atualizados."
            delay="200ms"
          />
          <InfoCard
            icon={<CheckCircle2 size={20} className="text-[var(--color-success)]" />}
            title="Validação automática"
            text="O sistema verifica campos obrigatórios, formatos de data, valores e alerta sobre inconsistências em tempo real."
            delay="300ms"
          />
          <InfoCard
            icon={<FileCheck size={20} className="text-[var(--color-accent)]" />}
            title="Documentos gerados"
            text="Os documentos seguem o padrão oficial da UFPB e estão prontos para assinatura digital ou impressão."
            delay="400ms"
          />
          <InfoCard
            icon={<CalendarDays size={20} className="text-[var(--color-accent-2)]" />}
            title="Relatório pós-viagem"
            text="O Anexo II deve ser preenchido em até 5 dias após o retorno da viagem, com descrição das atividades."
            delay="500ms"
          />
          <InfoCard
            icon={<ShieldCheck size={20} className="text-[var(--color-success)]" />}
            title="Segurança e privacidade"
            text="Seus dados são processados localmente no navegador. Nenhuma informação pessoal é enviada para servidores externos."
            delay="600ms"
          />
        </div>
      </section>

      {/* Segurança e Proteção de Dados */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={24} className="text-[var(--color-success)]" />
          <h2 className="text-lg font-semibold">Segurança e Proteção de Dados</h2>
        </div>

        <div className="space-y-6 text-sm text-[var(--color-text)] leading-relaxed">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-btn-bg)] border border-[var(--color-border)]">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lock size={16} className="text-[var(--color-accent)]" />
              Como seus dados são protegidos
            </h3>
            <p className="text-[var(--color-muted)]">
              Suas informações são tratadas com o mesmo cuidado que você teria com documentos importantes. 
              O sistema funciona como uma "cofre digital" temporário: seus dados ficam guardados de forma segura 
              enquanto você preenche o formulário e são automaticamente removidos em até 15 dias após o uso, 
              mesmo que você esqueça de limpar o navegador.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DataProtectionItem
              title="Criptografia no navegador"
              text="Seus dados são guardados no navegador usando tecnologia de criptografia avançada (AES-GCM), o mesmo padrão usado por bancos. Isso significa que mesmo alguém com acesso ao seu computador não conseguiria ler suas informações sem a chave de acesso."
            />
            <DataProtectionItem
              title="Dados não compartilhados"
              text="Nenhuma informação pessoal (como CPF, dados bancários ou endereço) é enviada para servidores externos. Tudo fica no seu computador durante o preenchimento e o documento gerado é baixado diretamente por você."
            />
            <DataProtectionItem
              title="Sem rastreamento"
              text="Não usamos cookies de publicidade, não vendemos dados e não compartilhamos informações com empresas. O único dado armazenado é um identificador anônimo para controle de limites de uso do sistema."
            />
            <DataProtectionItem
              title="Você no controle"
              text="A qualquer momento, você pode excluir seus dados clicando em 'Limpar tudo' no formulário ou removendo manualmente o histórico do navegador. Nenhuma informação fica retida permanentemente em nossos servidores."
            />
          </div>

          <div className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-warning)]/5">
            <h3 className="font-semibold mb-2 text-[var(--color-warning)]">
              Importante: dados sensíveis
            </h3>
            <p className="text-[var(--color-muted)]">
              Este sistema lida com informações pessoais (CPF, RG, dados bancários) que são protegidas 
              pela Lei Geral de Proteção de Dados (LGPD). Tratamos essas informações com responsabilidade 
              institucional e tecnologia de ponta para garantir que apenas você e os setores autorizados 
              da UFPB tenham acesso aos documentos gerados.
            </p>
          </div>
        </div>
      </section>

      {/* Dicas de preenchimento */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8 animate-in fade-in duration-300">
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
      className="group flex flex-col gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] hover:border-[var(--color-accent)]/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start">
        <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/10">{icon}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1 group-hover:text-[var(--color-accent)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] group-hover:gap-2.5 transition-all duration-200">
          Iniciar <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
        <span className="text-[11px] font-medium text-[var(--color-subtle)] uppercase tracking-wide">{badge}</span>
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
  delay,
}: {
  icon: React.ReactNode
  title: string
  text: string
  delay?: string
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-btn-bg)] border border-[var(--color-border)] animate-in fade-in duration-300${delay ? ` delay-[${delay}]` : ''}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function DataProtectionItem({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-md)] bg-[var(--color-btn-bg)] border border-[var(--color-border)]">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{text}</p>
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
