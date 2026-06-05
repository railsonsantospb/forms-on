export const TOTAL_STEPS = 9

export const STEPS = [
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

export const TP_LABELS: Record<string, string> = {
  diarias: 'Diárias',
  passagens: 'Passagens',
  diarias_e_passagens: 'Diárias e Passagens',
}

export const DEB_LABELS: Record<string, string> = {
  cchsa: 'CCHSA',
  cavn: 'CAVN',
  projeto: 'Projeto',
  outros: 'Outros',
}

export const TRANSP_LABELS: Record<string, string> = {
  veiculo_oficial: 'Veículo Oficial',
  empresa_terrestre: 'Empresa Terrestre',
  empresa_aerea: 'Empresa Aérea',
  veiculo_proprio: 'Veículo Próprio',
}

export const VINC_LABELS: Record<string, string> = {
  servidor: 'Servidor',
  nao_servidor: 'Não Servidor',
  sepe: 'SEPE',
  acompanhante_pcd: 'Acompanhante PCD',
  outro: 'Outro',
}

export function getStepPaths(step: number): string[] {
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

export function getFieldLabel(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path]
  const trechoMatch = path.match(/^trechos\.(ida|retorno)\.(\d+)\.(origem|destino|data_hora)$/)
  if (trechoMatch) {
    const [, tipo, idx, campo] = trechoMatch
    const tipoLabel = tipo === 'ida' ? 'Ida' : 'Retorno'
    const campoLabel = campo === 'data_hora' ? 'Data e hora' : campo.charAt(0).toUpperCase() + campo.slice(1)
    return `Trecho de ${tipoLabel} ${Number(idx) + 1} — ${campoLabel}`
  }
  return path
    .replace(/\./g, ' › ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
