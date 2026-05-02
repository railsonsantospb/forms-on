/* ===== Trecho ===== */
export interface Trecho {
  origem: string
  destino: string
  data_hora: string
}

/* ===== Anexo I ===== */
export interface Servidor {
  nome_completo: string
  cargo_funcao: string
  cpf: string
  rg: string
  data_nascimento: string
  siape: string
  nome_mae: string
  endereco: string
  telefone: string
  email: string
  dados_bancarios: {
    banco: string
    agencia: string
    conta: string
  }
  tipo_vinculo?: 'servidor' | 'nao_servidor' | 'sepe' | 'acompanhante_pcd' | 'outro'
  vinculo_outro_especificar?: string
  passaporte?: string
  lotacao_orgao?: string
  auxilio_transporte?: { recebe: boolean; valor?: string }
  auxilio_alimentacao?: { recebe: boolean; valor?: string }
}

export interface Anexo1Payload {
  tipo_solicitacao: 'diarias' | 'passagens' | 'diarias_e_passagens'
  data_solicitacao: string
  servidor: Servidor
  motivo_viagem: string
  relacao_pertinencia?: string
  trechos: {
    ida: Trecho[]
    retorno: Trecho[]
  }
  missao: {
    inicio_data_hora: string
    termino_data_hora: string
  }
  debito_recurso: {
    tipo: 'cchsa' | 'cavn' | 'projeto' | 'outros'
    detalhe?: string
  }
  transporte: {
    meios: ('veiculo_oficial' | 'empresa_terrestre' | 'empresa_aerea' | 'veiculo_proprio')[]
    distancia_km?: string
    termo_veiculo_proprio_ciente?: boolean
  }
  flags?: {
    envolve_fds_feriado_ou_dia_anterior?: boolean
    fora_do_prazo?: boolean
  }
  justificativas?: {
    justificativa_fds_feriado_dia_anterior?: string
    justificativa_fora_prazo?: string
    just_viagem_urgente?: string
    just_fds_feriado?: string
    just_aeroporto?: string
    just_grupo_mais_2?: string
    just_grupo_mais_5?: string
    just_mais_30_diarias?: string
  }
}

/* ===== Anexo II ===== */
export interface Proposto {
  nome: string
  cpf: string
  siape: string
  cargo_funcao?: string
  telefone?: string
  email?: string
  orgao: {
    tipo: 'cchsa' | 'cavn' | 'projetos' | 'outros'
    detalhe?: string
  }
}

export interface AtividadeTabelaRow {
  data?: string
  horario?: string
  cidade?: string
  atividades?: string
}

export interface AlteracaoTabelaRow {
  tipo?: string
  descricao?: string
}

export interface Anexo2Payload {
  data_relatorio: string
  proposto: Proposto
  afastamento: {
    ida: Trecho[]
    retorno: Trecho[]
  }
  alteracoes_cancelamentos_noshow?: AlteracaoTabelaRow[]
  atividades_tabela?: AtividadeTabelaRow[]
  flags?: {
    prestacao_contas_fora_prazo?: boolean
  }
  justificativa_prestacao_contas_fora_prazo?: string
  viagem_realizada: 'sim' | 'nao'
}

/* ===== API Responses ===== */
export interface PreviewResponse {
  ok: boolean
  issues?: ValidationIssue[]
}

export interface ValidationIssue {
  field: string
  message: string
}

export interface PrefillResponse {
  prefill: Partial<Anexo1Payload> | Partial<Anexo2Payload>
  warnings?: string[]
}

export interface ServerDateResponse {
  date: string
}
