import type { ChatFlowDefinition, ChatStateDefinition } from '@/features/chat/types'
import { isCPF, isEmail, isPhoneDigits, isSiape } from '@/lib/validators'
import { todayISO, formatDateBR, formatDateTimeBR, formatDateChat } from '@/lib/dates'

const SIM_NAO = [
  { label: 'Sim', value: 'sim' },
  { label: 'Não', value: 'nao' },
]

function makeText(
  id: string,
  question: string,
  next: string,
  opts?: { fieldPath?: string; min?: number; max?: number; custom?: (v: string) => string | null; nextState?: string | ((value: string, data: Record<string, unknown>) => string); allowEmpty?: boolean },
): ChatStateDefinition {
  return {
    id,
    question,
    inputMode: 'text',
    fieldPath: opts?.fieldPath,
    allowEmpty: opts?.allowEmpty,
    validation: (v) => {
      const t = v.trim()
      if (opts?.allowEmpty && t.length === 0) return null
      if (opts?.min && t.length < opts.min) return `Mínimo ${opts.min} caracteres`
      if (opts?.max && t.length > opts.max) return `Máximo ${opts.max} caracteres`
      if (opts?.custom) return opts.custom(t)
      return null
    },
    nextState: opts?.nextState || next,
  }
}

export function createAnexo2ChatFlow(onComplete: (data: Record<string, unknown>) => void): ChatFlowDefinition {
  const states: ChatStateDefinition[] = [
    {
      id: 'start',
      question: (data) => `Oi! Sou Dira, sua assistente virtual de preenchimento do Anexo II. Vou te ajudar com o relatório de viagem.\n\nVou preencher a data do relatório com a data de hoje.\n${formatDateChat((data.data_relatorio as string) || todayISO())}`,
      inputMode: 'date',
      fieldPath: 'data_relatorio',
      autoValue: () => todayISO(),
      formatDisplay: formatDateBR,
      validation: (v) => (!v ? 'Informe uma data válida' : null),
      nextState: 'proposto.nome',
    },
    // Proposto
    makeText('proposto.nome', 'Qual é o seu nome completo?', 'proposto.cpf', { fieldPath: 'proposto.nome', min: 3, max: 120 }),
    makeText('proposto.cpf', 'Me informe seu CPF (só os números).', 'proposto.siape', {
      fieldPath: 'proposto.cpf',
      custom: (v) => {
        const c = v.replace(/\D/g, '')
        return c.length === 11 && isCPF(c) ? null : 'CPF inválido'
      },
    }),
    makeText('proposto.siape', 'Qual é a sua matrícula SIAPE?', 'proposto.cargo', {
      fieldPath: 'proposto.siape',
      custom: (v) => (isSiape(v.replace(/\D/g, '')) ? null : 'SIAPE inválido'),
    }),
    makeText('proposto.cargo', 'Qual é o seu cargo ou função?', 'proposto.telefone', { fieldPath: 'proposto.cargo_funcao', min: 1, max: 80 }),
    makeText('proposto.telefone', 'Me passa um telefone de contato com DDD (só números).', 'proposto.email', {
      fieldPath: 'proposto.telefone',
      custom: (v) => (isPhoneDigits(v) ? null : 'Telefone inválido'),
    }),
    makeText('proposto.email', 'Qual o seu e-mail?', 'proposto.orgao', {
      fieldPath: 'proposto.email',
      custom: (v) => (isEmail(v) ? null : 'E-mail inválido'),
    }),
    {
      id: 'proposto.orgao',
      question: 'Qual é o seu órgão de exercício?',
      inputMode: 'quick',
      options: [
        { label: 'CCHSA', value: 'cchsa' },
        { label: 'CAVN', value: 'cavn' },
        { label: 'Projetos', value: 'projetos' },
        { label: 'Outros', value: 'outros' },
      ],
      fieldPath: 'proposto.orgao.tipo',
      nextState: (_v, data) => (['projetos', 'outros'].includes(((data.proposto as Record<string, unknown>)?.orgao as Record<string, unknown>)?.tipo as string) ? 'proposto.orgao_detalhe' : 'afastamento.ida.origem'),
    },
    makeText('proposto.orgao_detalhe', 'Qual o nome do projeto ou unidade?', 'afastamento.ida.origem', { fieldPath: 'proposto.orgao.detalhe', min: 2 }),

    // Afastamento (1 trecho cada)
    makeText('afastamento.ida.origem', 'De qual cidade você saiu? (Cidade/UF)', 'afastamento.ida.destino', {
      fieldPath: 'afastamento.ida.0.origem',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: João Pessoa/PB)'),
    }),
    makeText('afastamento.ida.destino', 'Para qual cidade você foi? (Cidade/UF)', 'afastamento.ida.data', {
      fieldPath: 'afastamento.ida.0.destino',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: Recife/PE)'),
    }),
    {
      id: 'afastamento.ida.data',
      question: 'Informe a data e hora de partida.',
      inputMode: 'datetime',
      fieldPath: 'afastamento.ida.0.data_hora',
      formatDisplay: formatDateTimeBR,
      nextState: 'afastamento.retorno.sugestao',
    },
    {
      id: 'afastamento.retorno.sugestao',
      question: (data) => {
        const ida = ((data.afastamento as Record<string, unknown>)?.ida as Record<string, unknown>)?.['0'] as Record<string, unknown>
        const origem = (ida?.origem as string) || ''
        const destino = (ida?.destino as string) || ''
        return `Para o retorno, usar o inverso da ida?\n→ Origem: ${destino}\n→ Destino: ${origem}`
      },
      inputMode: 'quick',
      options: [
        { label: 'Sim, usar inverso', value: 'sim', variant: 'primary' },
        { label: 'Não, informar manualmente', value: 'nao' },
      ],
      nextState: (_v, data) => {
        if (_v === 'sim') {
          const afastamento = data.afastamento as Record<string, unknown>
          const ida = (afastamento?.ida as Record<string, unknown>)?.['0'] as Record<string, unknown>
          const idaOrigem = (ida?.origem as string) || ''
          const idaDestino = (ida?.destino as string) || ''
          if (!afastamento.retorno) afastamento.retorno = {}
          const retorno = afastamento.retorno as Record<string, unknown>
          if (!retorno['0']) retorno['0'] = {}
          const firstRetorno = retorno['0'] as Record<string, unknown>
          firstRetorno.origem = idaDestino
          firstRetorno.destino = idaOrigem
          return 'afastamento.retorno.data'
        }
        return 'afastamento.retorno.origem'
      },
    },
    makeText('afastamento.retorno.origem', 'Qual cidade foi a origem do retorno? (Cidade/UF)', 'afastamento.retorno.destino', {
      fieldPath: 'afastamento.retorno.0.origem',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: João Pessoa/PB)'),
    }),
    makeText('afastamento.retorno.destino', 'Qual cidade foi o destino do retorno? (Cidade/UF)', 'afastamento.retorno.data', {
      fieldPath: 'afastamento.retorno.0.destino',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: Recife/PE)'),
    }),
    {
      id: 'afastamento.retorno.data',
      question: 'Informe a data e hora de retorno.',
      inputMode: 'datetime',
      fieldPath: 'afastamento.retorno.0.data_hora',
      formatDisplay: formatDateTimeBR,
      validation: (v, data) => {
        const ida = (data.afastamento as Record<string, unknown>)?.ida as unknown[] | undefined
        if (ida?.[0]) {
          const idaDate = new Date(((ida[0] as Record<string, unknown>).data_hora as string) || '')
          const retDate = new Date(v)
          if (retDate < idaDate) return 'O retorno não pode ser anterior à ida'
        }
        return null
      },
      nextState: 'viagem_realizada',
    },

    // Viagem realizada
    {
      id: 'viagem_realizada',
      question: 'A viagem foi realizada?',
      inputMode: 'quick',
      options: SIM_NAO,
      fieldPath: 'viagem_realizada',
      nextState: 'alteracoes',
    },

    {
      id: 'alteracoes',
      question: 'Quer adicionar uma linha na tabela de alterações / cancelamentos / no show?',
      inputMode: 'quick',
      options: [
        { label: 'Sim', value: 'sim' },
        { label: 'Não', value: 'nao' },
      ],
      nextState: (_v, data) => {
        const rows = (data._chat_alteracoes as string[]) || []
        if (_v === 'sim') {
          return 'alteracoes.linha'
        }
        if (rows.length > 0) {
          data.alteracoes_cancelamentos_noshow = rows.map((r) => {
            const parts = r.split(';')
            return {
              tipo: parts[0]?.trim() || '',
              descricao: parts[1]?.trim() || '',
            }
          })
        }
        return 'atividades_tabela'
      },
    },
    makeText('alteracoes.linha', 'Informe separado por ponto-e-vírgula: Tipo (Alteração/Cancelamento/No Show/Outro); Descrição', 'alteracoes', {
      fieldPath: '_chat_alteracoes_row',
      custom: (v) => (v.split(';').length >= 2 ? null : 'Use o formato: Tipo; Descrição'),
      nextState: (_v, data) => {
        const row = data._chat_alteracoes_row as string
        if (row) {
          const acc = (data._chat_alteracoes as string[]) || []
          data._chat_alteracoes = [...acc, row]
        }
        return 'alteracoes'
      },
    }),

    {
      id: 'atividades_tabela',
      question: 'Quer adicionar uma linha na tabela de atividades?',
      inputMode: 'quick',
      options: [
        { label: 'Sim', value: 'sim' },
        { label: 'Não', value: 'nao' },
      ],
      nextState: (_v, data) => {
        const rows = (data._chat_tabela as string[]) || []
        if (_v === 'sim') {
          return 'atividades_tabela.linha'
        }
        if (rows.length > 0) {
          data.atividades_tabela = rows.map((r) => {
            const parts = r.split(';')
            return {
              data: parts[0]?.trim() || '',
              horario: parts[1]?.trim() || '',
              cidade: parts[2]?.trim() || '',
              atividades: parts[3]?.trim() || '',
            }
          })
        }
        // Calcula fora_do_prazo
        const flags = { prestacao_contas_fora_prazo: false }
        const retornoArr = (data.afastamento as Record<string, unknown>)?.retorno as unknown[] | undefined
        if (retornoArr?.[0]) {
          const retDate = ((retornoArr[0] as Record<string, unknown>).data_hora as string).slice(0, 10)
          const diff = Math.floor((new Date(todayISO()).getTime() - new Date(retDate).getTime()) / 86400000)
          flags.prestacao_contas_fora_prazo = diff > 5
        }
        data.flags = flags
        return flags.prestacao_contas_fora_prazo ? 'justificativa.prazo' : 'summary'
      },
    },
    makeText('atividades_tabela.linha', 'Informe separado por ponto-e-vírgula: Data; Horário; Cidade; Atividades', 'atividades_tabela', {
      fieldPath: '_chat_tabela_row',
      custom: (v) => (v.split(';').length >= 3 ? null : 'Use o formato: Data; Horário; Cidade; Atividades'),
      nextState: (_v, data) => {
        const row = data._chat_tabela_row as string
        if (row) {
          const acc = (data._chat_tabela as string[]) || []
          data._chat_tabela = [...acc, row]
        }
        return 'atividades_tabela'
      },
    }),

    // Justificativa prazo
    makeText('justificativa.prazo', 'O relatório está fora do prazo (mais de 5 dias após retorno). Qual a justificativa? (mín. 10 caracteres)', 'summary', {
      fieldPath: 'justificativa_prestacao_contas_fora_prazo',
      min: 10,
      max: 2000,
    }),

    // Summary
    {
      id: 'summary',
      question: (data) => {
        const nome = String((data.proposto as Record<string, unknown>)?.nome || '').split(' ')[0]
        return `Perfeito${nome ? ', ' + nome : ''}! Reuni todos os dados do relatório. Posso aplicar no formulário para você?`
      },
      inputMode: 'quick',
      options: [{ label: 'Sim, aplicar', value: 'aplicar' }],
      nextState: 'done',
    },
    {
      id: 'done',
      question: 'Prontinho! Dados aplicados no formulário. Revise e gere o documento quando estiver pronto. Se precisar de mim, é só chamar! 😉',
      inputMode: 'quick',
      options: [],
      nextState: 'done',
      isFinal: true,
    },
  ]

  return { states, initialState: 'start', onComplete }
}
