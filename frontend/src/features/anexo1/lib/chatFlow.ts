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
  opts?: { fieldPath?: string; min?: number; max?: number; custom?: (v: string) => string | null; nextState?: string; allowEmpty?: boolean },
): ChatStateDefinition {
  return {
    id,
    question,
    inputMode: 'text',
    fieldPath: opts?.fieldPath,
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

function makeJustificativaCheck(
  id: string,
  question: string,
  yesNext: string,
  noNext: string,
): ChatStateDefinition {
  return {
    id,
    question,
    inputMode: 'quick',
    options: SIM_NAO,
    nextState: (_v) => (_v === 'sim' ? yesNext : noNext),
  }
}

function makeJustificativaText(
  id: string,
  question: string,
  next: string,
  fieldPath: string,
): ChatStateDefinition {
  return makeText(id, question, next, {
    fieldPath,
    min: 10,
    max: 2000,
    allowEmpty: true,
  })
}

export function createAnexo1ChatFlow(onComplete: (data: Record<string, unknown>) => void): ChatFlowDefinition {
  const states: ChatStateDefinition[] = [
    {
      id: 'start',
      question: 'Oi! Sou Dira, sua assistente virtual de preenchimento do Anexo I. Vou te ajudar a preencher a requisição de diárias/passagens.\n\nQual é o tipo da sua solicitação?',
      inputMode: 'quick',
      options: [
        { label: 'Diárias', value: 'diarias' },
        { label: 'Passagens', value: 'passagens' },
        { label: 'Diárias + Passagens', value: 'diarias_e_passagens' },
      ],
      fieldPath: 'tipo_solicitacao',
      nextState: 'data_solicitacao',
    },
    {
      id: 'data_solicitacao',
      question: (data) => `Vou preencher a data da solicitação com a data de hoje.\n${formatDateChat((data.data_solicitacao as string) || todayISO())}`,
      inputMode: 'date',
      fieldPath: 'data_solicitacao',
      autoValue: () => todayISO(),
      formatDisplay: formatDateBR,
      validation: (v) => (!v ? 'Informe uma data válida' : null),
      nextState: 'servidor.nome',
    },
    makeText('servidor.nome', 'Qual é o seu nome completo?', 'servidor.cargo', { fieldPath: 'servidor.nome_completo', min: 3, max: 120 }),
    makeText('servidor.cargo', 'Qual é o seu cargo ou função?', 'servidor.cpf', { fieldPath: 'servidor.cargo_funcao', min: 2, max: 80 }),
    makeText('servidor.cpf', 'Me informe seu CPF (só os números).', 'servidor.rg', {
      fieldPath: 'servidor.cpf',
      custom: (v) => {
        const c = v.replace(/\D/g, '')
        return c.length === 11 && isCPF(c) ? null : 'CPF inválido'
      },
    }),
    makeText('servidor.rg', 'Agora o seu RG (só os números).', 'servidor.nascimento', {
      fieldPath: 'servidor.rg',
      min: 3,
      max: 20,
      custom: (v) => (/^\d+$/.test(v) ? null : 'RG deve conter apenas números'),
    }),
    {
      id: 'servidor.nascimento',
      question: 'Qual a sua data de nascimento?',
      inputMode: 'date',
      fieldPath: 'servidor.data_nascimento',
      formatDisplay: formatDateBR,
      nextState: 'servidor.siape',
    },
    makeText('servidor.siape', 'Qual é a sua matrícula SIAPE?', 'servidor.mae', {
      fieldPath: 'servidor.siape',
      custom: (v) => (isSiape(v.replace(/\D/g, '')) ? null : 'SIAPE inválido'),
    }),
    makeText('servidor.mae', 'Nome completo da sua mãe.', 'servidor.endereco', { fieldPath: 'servidor.nome_mae', min: 3, max: 120 }),
    makeText('servidor.endereco', 'Qual é o seu endereço completo?', 'servidor.telefone', { fieldPath: 'servidor.endereco', min: 5, max: 200 }),
    makeText('servidor.telefone', 'Me passa um telefone de contato com DDD (só números).', 'servidor.email', {
      fieldPath: 'servidor.telefone',
      custom: (v) => (isPhoneDigits(v) ? null : 'Telefone inválido'),
    }),
    makeText('servidor.email', 'Qual o seu e-mail institucional?', 'servidor.banco', {
      fieldPath: 'servidor.email',
      custom: (v) => (isEmail(v) ? null : 'E-mail inválido'),
    }),
    makeText('servidor.banco', 'Qual é o banco da sua conta salário?', 'servidor.agencia', { fieldPath: 'servidor.dados_bancarios.banco', min: 2, max: 40 }),
    makeText('servidor.agencia', 'Qual é a agência? (só números)', 'servidor.conta', {
      fieldPath: 'servidor.dados_bancarios.agencia',
      custom: (v) => (/^\d{1,10}$/.test(v) ? null : 'Apenas números'),
    }),
    makeText('servidor.conta', 'E o número da conta? (só números)', 'servidor.vinculo', {
      fieldPath: 'servidor.dados_bancarios.conta',
      custom: (v) => (/^\d{1,20}$/.test(v) ? null : 'Apenas números'),
    }),
    {
      id: 'servidor.vinculo',
      question: 'Qual é o seu tipo de vínculo?',
      inputMode: 'quick',
      options: [
        { label: 'Servidor', value: 'servidor' },
        { label: 'Não Servidor', value: 'nao_servidor' },
        { label: 'SEPE', value: 'sepe' },
        { label: 'Acompanhante PCD', value: 'acompanhante_pcd' },
        { label: 'Outro', value: 'outro' },
      ],
      fieldPath: 'servidor.tipo_vinculo',
      nextState: (_v, data) => ((data.servidor as Record<string, unknown>)?.tipo_vinculo === 'outro' ? 'servidor.vinculo_outro' : 'servidor.passaporte'),
    },
    makeText('servidor.vinculo_outro', 'Por favor, especifique o vínculo.', 'servidor.passaporte', { fieldPath: 'servidor.vinculo_outro_especificar', min: 2 }),
    makeText('servidor.passaporte', 'Se for viagem internacional, informe o passaporte. (Deixe em branco se não for)', 'servidor.auxilio_transporte', { fieldPath: 'servidor.passaporte', max: 40, allowEmpty: true }),

    // Auxílio transporte e alimentação
    makeText('servidor.auxilio_transporte', 'Qual o valor do auxílio transporte? (Deixe em branco se não recebe)', 'servidor.auxilio_alimentacao', {
      fieldPath: 'servidor.auxilio_transporte.valor',
      allowEmpty: true,
    }),
    makeText('servidor.auxilio_alimentacao', 'Qual o valor do auxílio alimentação? (Deixe em branco se não recebe)', 'servidor.lotacao', {
      fieldPath: 'servidor.auxilio_alimentacao.valor',
      allowEmpty: true,
    }),

    makeText('servidor.lotacao', 'Qual é a sua lotação/órgão?', 'trechos.ida.origem', { fieldPath: 'servidor.lotacao_orgao', max: 120 }),

    // Trechos (simplificado: 1 trecho de ida e 1 de retorno)
    makeText('trechos.ida.origem', 'De qual cidade você vai sair? (Cidade/UF)', 'trechos.ida.destino', {
      fieldPath: 'trechos.ida.0.origem',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: João Pessoa/PB)'),
    }),
    makeText('trechos.ida.destino', 'Para qual cidade você vai? (Cidade/UF)', 'trechos.ida.data', {
      fieldPath: 'trechos.ida.0.destino',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: Recife/PE)'),
    }),
    {
      id: 'trechos.ida.data',
      question: 'Informe a data e hora de partida.',
      inputMode: 'datetime',
      fieldPath: 'trechos.ida.0.data_hora',
      formatDisplay: formatDateTimeBR,
      nextState: 'trechos.retorno.origem',
    },
    makeText('trechos.retorno.origem', 'Qual cidade será a origem do retorno? (Cidade/UF)', 'trechos.retorno.destino', {
      fieldPath: 'trechos.retorno.0.origem',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: João Pessoa/PB)'),
    }),
    makeText('trechos.retorno.destino', 'Qual cidade será o destino do retorno? (Cidade/UF)', 'trechos.retorno.data', {
      fieldPath: 'trechos.retorno.0.destino',
      min: 2,
      custom: (v) => (/^.+\/\s*[A-Za-z]{2}$/.test(v) ? null : 'Informe no formato Cidade/UF (ex: Recife/PE)'),
    }),
    {
      id: 'trechos.retorno.data',
      question: 'Informe a data e hora de retorno.',
      inputMode: 'datetime',
      fieldPath: 'trechos.retorno.0.data_hora',
      formatDisplay: formatDateTimeBR,
      validation: (v, data) => {
        const ida = (data.trechos as Record<string, unknown>)?.ida as unknown[] | undefined
        if (ida?.[0]) {
          const idaDate = new Date(((ida[0] as Record<string, unknown>).data_hora as string) || '')
          const retDate = new Date(v)
          if (retDate < idaDate) return 'O retorno não pode ser anterior à ida'
        }
        return null
      },
      nextState: 'missao.inicio',
    },

    // Missão
    {
      id: 'missao.inicio',
      question: 'Quando começa a missão oficial?',
      inputMode: 'datetime',
      fieldPath: 'missao.inicio_data_hora',
      formatDisplay: formatDateTimeBR,
      nextState: 'missao.termino',
    },
    {
      id: 'missao.termino',
      question: 'E quando termina a missão oficial?',
      inputMode: 'datetime',
      fieldPath: 'missao.termino_data_hora',
      formatDisplay: formatDateTimeBR,
      validation: (v, data) => {
        const inicio = (data.missao as Record<string, unknown>)?.inicio_data_hora as string
        if (inicio) {
          const inicioDate = new Date(inicio)
          const terminoDate = new Date(v)
          if (terminoDate < inicioDate) return 'O término da missão não pode ser anterior ao início'
        }
        return null
      },
      nextState: 'motivo',
    },

    // Motivo
    makeText('motivo', 'Descreva o motivo da viagem (mín. 20 caracteres).', 'pertinencia', { fieldPath: 'motivo_viagem', min: 20, max: 2000 }),
    makeText('pertinencia', 'Descreva a relação de pertinência. (Deixe em branco se não for necessário)', 'debito.tipo', {
      fieldPath: 'relacao_pertinencia',
      allowEmpty: true,
      nextState: 'debito.tipo',
    }),

    // Débito
    {
      id: 'debito.tipo',
      question: 'De qual fonte sairão os recursos?',
      inputMode: 'quick',
      options: [
        { label: 'CCHSA', value: 'cchsa' },
        { label: 'CAVN', value: 'cavn' },
        { label: 'Projeto', value: 'projeto' },
        { label: 'Outros', value: 'outros' },
      ],
      fieldPath: 'debito_recurso.tipo',
      nextState: (_v, data) => (['projeto', 'outros'].includes((data.debito_recurso as Record<string, unknown>)?.tipo as string) ? 'debito.detalhe' : 'transporte.meios'),
    },
    makeText('debito.detalhe', 'Qual o nome ou código do projeto/unidade?', 'transporte.meios', { fieldPath: 'debito_recurso.detalhe', min: 2 }),

    // Transporte
    {
      id: 'transporte.meios',
      question: 'Selecione os meios de transporte (um por vez, depois confirme):\n\n1) Veículo Oficial\n2) Empresa Terrestre\n3) Empresa Aérea\n4) Veículo Próprio\n5) Concluir seleção',
      inputMode: 'quick',
      options: [
        { label: 'Veículo Oficial', value: 'veiculo_oficial' },
        { label: 'Empresa Terrestre', value: 'empresa_terrestre' },
        { label: 'Empresa Aérea', value: 'empresa_aerea' },
        { label: 'Veículo Próprio', value: 'veiculo_proprio' },
        { label: '✓ Concluir', value: '__done__' },
      ],
      formatDisplay: (v) => {
        if (v === '__done__') return '✓ Concluído'
        const labels: Record<string, string> = {
          veiculo_oficial: 'Veículo Oficial',
          empresa_terrestre: 'Empresa Terrestre',
          empresa_aerea: 'Empresa Aérea',
          veiculo_proprio: 'Veículo Próprio',
        }
        return labels[v] || v
      },
      nextState: (_v, data) => {
        const meios = (data._chat_meios as string[]) || []
        if (_v === '__done__') {
          data.transporte = { meios }
          return meios.includes('veiculo_proprio') ? 'transporte.termo' : 'flags.fds'
        }
        if (!meios.includes(_v)) meios.push(_v)
        data._chat_meios = meios
        return 'transporte.meios'
      },
    },
    {
      id: 'transporte.termo',
      question: 'Você está ciente do termo de responsabilidade para uso de veículo próprio?',
      inputMode: 'quick',
      options: SIM_NAO,
      nextState: (_v, data) => {
        if (data.transporte) (data.transporte as Record<string, unknown>).termo_veiculo_proprio_ciente = _v === 'sim'
        return _v === 'sim' ? 'transporte.distancia' : 'transporte.termo'
      },
    },
    makeText('transporte.distancia', 'Qual a distância estimada em km?', 'flags.fds', {
      fieldPath: 'transporte.distancia_km',
    }),

    // Flags
    {
      id: 'flags.fds',
      question: 'A viagem envolve fim de semana, feriado ou dia anterior?',
      inputMode: 'quick',
      options: SIM_NAO,
      nextState: (_v, data) => {
        const flags = { envolve_fds_feriado_ou_dia_anterior: _v === 'sim', fora_do_prazo: false }
        // Calcula fora_do_prazo
        const tipo = (data.tipo_solicitacao as string) || 'diarias'
        const prazoDias = tipo === 'passagens' ? 30 : 10
        const dataSolic = (data.data_solicitacao as string) || todayISO()
        const trechosIda = (data.trechos as Record<string, unknown>)?.ida as unknown[] | undefined
        if (trechosIda?.[0]) {
          const idaDate = ((trechosIda[0] as Record<string, unknown>).data_hora as string).slice(0, 10)
          const diff = Math.floor((new Date(idaDate).getTime() - new Date(dataSolic).getTime()) / 86400000)
          flags.fora_do_prazo = diff < prazoDias
        }
        data.flags = flags
        return flags.envolve_fds_feriado_ou_dia_anterior ? 'justificativa.fds' : (flags.fora_do_prazo ? 'justificativa.prazo' : 'just.viagem_urgente.check')
      },
    },
    makeText('justificativa.fds', 'Justificativa para fim de semana/feriado/dia anterior (mín. 10 caracteres):', 'justificativa.prazo_check', {
      fieldPath: 'justificativas.justificativa_fds_feriado_dia_anterior',
      min: 10,
      max: 2000,
    }),
    {
      id: 'justificativa.prazo_check',
      question: '',
      inputMode: 'quick',
      options: [],
      skipIf: () => true,
      nextState: (_v, data) => ((data.flags as Record<string, unknown>)?.fora_do_prazo ? 'justificativa.prazo' : 'just.viagem_urgente.check'),
    },
    makeText('justificativa.prazo', 'Justificativa fora do prazo (mín. 10 caracteres):', 'just.viagem_urgente.check', {
      fieldPath: 'justificativas.justificativa_fora_prazo',
      min: 10,
      max: 2000,
    }),

    // Justificativas adicionais (6 checkboxes do wizard)
    makeJustificativaCheck('just.viagem_urgente.check', 'A viagem é urgente (menos de 20 dias de antecedência)?', 'just.viagem_urgente.text', 'just.fds_feriado.check'),
    makeJustificativaText('just.viagem_urgente.text', 'Justifique a urgência (mín. 10 caracteres):', 'just.fds_feriado.check', 'justificativas.just_viagem_urgente'),

    makeJustificativaCheck('just.fds_feriado.check', 'A viagem envolve final de semana, feriado ou iniciada na sexta-feira?', 'just.fds_feriado.text', 'just.aeroporto.check'),
    makeJustificativaText('just.fds_feriado.text', 'Justifique o fim de semana/feriado (mín. 10 caracteres):', 'just.aeroporto.check', 'justificativas.just_fds_feriado'),

    makeJustificativaCheck('just.aeroporto.check', 'Há especificação de aeroporto?', 'just.aeroporto.text', 'just.grupo_mais_2.check'),
    makeJustificativaText('just.aeroporto.text', 'Justifique a especificação de aeroporto (mín. 10 caracteres):', 'just.grupo_mais_2.check', 'justificativas.just_aeroporto'),

    makeJustificativaCheck('just.grupo_mais_2.check', 'É grupo de mais de 2 pessoas?', 'just.grupo_mais_2.text', 'just.grupo_mais_5.check'),
    makeJustificativaText('just.grupo_mais_2.text', 'Justifique o grupo de mais de 2 pessoas (mín. 10 caracteres):', 'just.grupo_mais_5.check', 'justificativas.just_grupo_mais_2'),

    makeJustificativaCheck('just.grupo_mais_5.check', 'É grupo de mais de 5 pessoas (competência do Dirigente máximo da UFPB)?', 'just.grupo_mais_5.text', 'just.mais_30_diarias.check'),
    makeJustificativaText('just.grupo_mais_5.text', 'Justifique o grupo de mais de 5 pessoas (mín. 10 caracteres):', 'just.mais_30_diarias.check', 'justificativas.just_grupo_mais_5'),

    makeJustificativaCheck('just.mais_30_diarias.check', 'Acumula mais de 30 diárias no exercício (competência do Dirigente máximo da UFPB)?', 'just.mais_30_diarias.text', 'summary'),
    makeJustificativaText('just.mais_30_diarias.text', 'Justifique as mais de 30 diárias acumuladas (mín. 10 caracteres):', 'summary', 'justificativas.just_mais_30_diarias'),

    // Summary
    {
      id: 'summary',
      question: (data) => {
        const nome = String((data.servidor as Record<string, unknown>)?.nome_completo || '').split(' ')[0]
        return `Perfeito${nome ? ', ' + nome : ''}! Reuni todos os dados. Posso aplicar no formulário para você?`
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
