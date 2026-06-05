import { z } from 'zod'
import { isCPF } from '@/lib/validators'

export const trechoSchema = z.object({
  origem: z.string()
    .min(2, 'Informe a origem')
    .max(80, 'Máximo 80 caracteres')
    .regex(/^.+\/\s*[A-Za-z]{2}$/, 'Informe no formato Cidade/UF (ex: João Pessoa/PB)'),
  destino: z.string()
    .min(2, 'Informe o destino')
    .max(80, 'Máximo 80 caracteres')
    .regex(/^.+\/\s*[A-Za-z]{2}$/, 'Informe no formato Cidade/UF (ex: Recife/PE)'),
  data_hora: z.string().min(1, 'Informe a data e hora'),
})

export const anexo1Schema = z.object({
  tipo_solicitacao: z.enum(['diarias', 'passagens', 'diarias_e_passagens'], {
    message: 'Selecione o tipo de solicitação',
  }),
  data_solicitacao: z.string().min(1, 'Informe a data'),
  servidor: z.object({
    nome_completo: z.string().min(3, 'Informe o nome completo').max(120, 'Máximo 120 caracteres'),
    cargo_funcao: z.string().min(2, 'Informe o cargo/função').max(80, 'Máximo 80 caracteres'),
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos').refine(isCPF, 'CPF inválido'),
    rg: z.string().min(3, 'Informe o RG').max(20, 'Máximo 20 caracteres'),
    data_nascimento: z.string()
      .min(1, 'Informe a data de nascimento')
      .refine((val) => {
        const d = new Date(val)
        const now = new Date()
        const minDate = new Date('1920-01-01')
        return !isNaN(d.getTime()) && d < now && d > minDate
      }, 'Data de nascimento inválida'),
    siape: z.string().regex(/^\d{4,15}$/, 'SIAPE deve ter 4 a 15 dígitos'),
    nome_mae: z.string().min(3, 'Informe o nome da mãe').max(120, 'Máximo 120 caracteres'),
    endereco: z.string().min(5, 'Informe o endereço completo').max(200, 'Máximo 200 caracteres'),
    telefone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
    email: z.string().email('E-mail inválido').max(120, 'Máximo 120 caracteres'),
    dados_bancarios: z.object({
      banco: z.string().min(2, 'Informe o banco').max(40, 'Máximo 40 caracteres'),
      agencia: z.string().regex(/^\d{1,10}$/, 'Apenas números'),
      conta: z.string().regex(/^\d{1,20}$/, 'Apenas números'),
    }),
    tipo_vinculo: z.enum(['servidor', 'nao_servidor', 'sepe', 'acompanhante_pcd', 'outro'], {
      message: 'Selecione o vínculo',
    }),
    vinculo_outro_especificar: z.string().optional(),
    passaporte: z.string().max(40, 'Máximo 40 caracteres').optional(),
    lotacao_orgao: z.string().max(120, 'Máximo 120 caracteres').optional(),
    auxilio_transporte: z.object({
      recebe: z.boolean(),
      valor: z.string().optional(),
    }).optional(),
    auxilio_alimentacao: z.object({
      recebe: z.boolean(),
      valor: z.string().optional(),
    }).optional(),
  }),
  motivo_viagem: z.string().min(20, 'Mínimo 20 caracteres').max(2000, 'Máximo 2000 caracteres'),
  relacao_pertinencia: z.string()
    .min(10, 'Mínimo 10 caracteres')
    .max(2000, 'Máximo 2000 caracteres'),
  trechos: z.object({
    ida: z.array(trechoSchema).min(1, 'Adicione pelo menos um trecho de ida'),
    retorno: z.array(trechoSchema).min(1, 'Adicione pelo menos um trecho de retorno'),
  }).superRefine((data, ctx) => {
    // Validação de sequência dos trechos de ida
    for (let i = 1; i < data.ida.length; i++) {
      const prev = new Date(data.ida[i - 1].data_hora)
      const curr = new Date(data.ida[i].data_hora)
      if (curr < prev) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Trecho ${i + 1} de ida não pode ser anterior ao trecho ${i}`,
          path: ['ida', i, 'data_hora'],
        })
      }
    }

    // Validação de sequência dos trechos de retorno
    for (let i = 1; i < data.retorno.length; i++) {
      const prev = new Date(data.retorno[i - 1].data_hora)
      const curr = new Date(data.retorno[i].data_hora)
      if (curr < prev) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Trecho ${i + 1} de retorno não pode ser anterior ao trecho ${i}`,
          path: ['retorno', i, 'data_hora'],
        })
      }
    }

    // Retorno >= último trecho de ida
    if (data.ida.length && data.retorno.length) {
      const lastIda = new Date(data.ida[data.ida.length - 1].data_hora)
      const firstRet = new Date(data.retorno[0].data_hora)
      if (firstRet < lastIda) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Primeiro trecho de retorno não pode ser anterior ao último trecho de ida',
          path: ['retorno', 0, 'data_hora'],
        })
      }
    }

    // === REGRAS DE CIDADE ===
    data.ida.forEach((t, i) => {
      if (t.origem && t.destino && t.origem.trim().toLowerCase() === t.destino.trim().toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A origem e o destino não podem ser a mesma cidade',
          path: ['ida', i, 'destino'],
        })
      }
    })
    data.retorno.forEach((t, i) => {
      if (t.origem && t.destino && t.origem.trim().toLowerCase() === t.destino.trim().toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A origem e o destino não podem ser a mesma cidade',
          path: ['retorno', i, 'destino'],
        })
      }
    })

    for (let i = 0; i < data.ida.length - 1; i++) {
      if (data.ida[i].destino && data.ida[i + 1].origem &&
          data.ida[i].destino.trim().toLowerCase() !== data.ida[i + 1].origem.trim().toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `O destino do trecho ${i + 1} deve ser a origem do trecho ${i + 2}`,
          path: ['ida', i + 1, 'origem'],
        })
      }
    }
    for (let i = 0; i < data.retorno.length - 1; i++) {
      if (data.retorno[i].destino && data.retorno[i + 1].origem &&
          data.retorno[i].destino.trim().toLowerCase() !== data.retorno[i + 1].origem.trim().toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `O destino do trecho ${i + 1} deve ser a origem do trecho ${i + 2}`,
          path: ['retorno', i + 1, 'origem'],
        })
      }
    }

    if (data.ida.length && data.retorno.length) {
      const ultimoDestinoIda = data.ida[data.ida.length - 1].destino
      const primeiraOrigemRet = data.retorno[0].origem
      if (ultimoDestinoIda && primeiraOrigemRet &&
          ultimoDestinoIda.trim().toLowerCase() !== primeiraOrigemRet.trim().toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O destino da ida deve ser o mesmo que a origem do retorno',
          path: ['retorno', 0, 'origem'],
        })
      }
    }
  }),
  missao: z.object({
    inicio_data_hora: z.string().min(1, 'Informe o início'),
    termino_data_hora: z.string().min(1, 'Informe o término'),
  }),
  debito_recurso: z.object({
    tipo: z.enum(['cchsa', 'cavn', 'projeto', 'outros'], {
      message: 'Selecione o tipo de recurso',
    }),
    detalhe: z.string().optional(),
  }),
  transporte: z.object({
    meios: z.array(z.enum(['veiculo_oficial', 'empresa_terrestre', 'empresa_aerea', 'veiculo_proprio'], {
      message: 'Selecione um meio de transporte válido',
    })).min(1, 'Selecione pelo menos um meio de transporte'),
    distancia_km: z.string().optional(),
    termo_veiculo_proprio_ciente: z.boolean().optional(),
  }),
  flags: z.object({
    envolve_fds_feriado_ou_dia_anterior: z.boolean().optional(),
    fora_do_prazo: z.boolean().optional(),
  }).optional(),
  justificativas: z.object({
    justificativa_fds_feriado_dia_anterior: z.string().optional(),
    justificativa_fora_prazo: z.string().optional(),
    just_viagem_urgente: z.string().optional(),
    just_fds_feriado: z.string().optional(),
    just_aeroporto: z.string().optional(),
    just_grupo_mais_2: z.string().optional(),
    just_grupo_mais_5: z.string().optional(),
    just_mais_30_diarias: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  // Missão: termino >= inicio
  if (data.missao.inicio_data_hora && data.missao.termino_data_hora) {
    const inicio = new Date(data.missao.inicio_data_hora)
    const termino = new Date(data.missao.termino_data_hora)
    if (termino < inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Término deve ser após o início',
        path: ['missao', 'termino_data_hora'],
      })
    }
  }

  // A ida pode ser antes do início da missão (deslocamento prévio)
  // e o retorno pode ser depois do término (deslocamento posterior).
  // Mas a missão não pode começar antes da chegada nem terminar depois da volta.
  if (data.missao.inicio_data_hora && data.trechos.ida.length && data.trechos.ida[0].data_hora) {
    const inicioMissao = new Date(data.missao.inicio_data_hora)
    const firstIda = new Date(data.trechos.ida[0].data_hora)
    if (inicioMissao < firstIda) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Início da missão não pode ser anterior ao primeiro trecho de ida',
        path: ['missao', 'inicio_data_hora'],
      })
    }
  }

  if (data.missao.termino_data_hora && data.trechos.retorno.length && data.trechos.retorno[data.trechos.retorno.length - 1].data_hora) {
    const terminoMissao = new Date(data.missao.termino_data_hora)
    const lastRet = new Date(data.trechos.retorno[data.trechos.retorno.length - 1].data_hora)
    if (terminoMissao > lastRet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Término da missão não pode ser posterior ao último trecho de retorno',
        path: ['missao', 'termino_data_hora'],
      })
    }
  }

  if (data.missao.inicio_data_hora && data.trechos.retorno.length && data.trechos.retorno[0].data_hora) {
    const inicioMissao = new Date(data.missao.inicio_data_hora)
    const firstRet = new Date(data.trechos.retorno[0].data_hora)
    if (firstRet < inicioMissao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primeiro trecho de retorno não pode ser anterior ao início da missão',
        path: ['trechos', 'retorno', 0, 'data_hora'],
      })
    }
  }

  // Débito: projeto/outros precisa de detalhe
  if ((data.debito_recurso.tipo === 'projeto' || data.debito_recurso.tipo === 'outros') &&
      (!data.debito_recurso.detalhe || data.debito_recurso.detalhe.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o nome/código do projeto',
      path: ['debito_recurso', 'detalhe'],
    })
  }

  // Servidor: lotação/órgão obrigatório
  if (data.servidor.tipo_vinculo === 'servidor' && (!data.servidor.lotacao_orgao || data.servidor.lotacao_orgao.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe a lotação/órgão',
      path: ['servidor', 'lotacao_orgao'],
    })
  }

  // Vínculo "outro" precisa de especificação
  if (data.servidor.tipo_vinculo === 'outro' &&
      (!data.servidor.vinculo_outro_especificar ||
       data.servidor.vinculo_outro_especificar.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Especifique o tipo de vínculo',
      path: ['servidor', 'vinculo_outro_especificar'],
    })
  }

  // Veículo próprio: termo obrigatório
  if (data.transporte.meios.includes('veiculo_proprio') && !data.transporte.termo_veiculo_proprio_ciente) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Confirme que está ciente do termo de responsabilidade',
      path: ['transporte', 'termo_veiculo_proprio_ciente'],
    })
  }

  // Fim de Semana: justificativa obrigatória
  if (data.flags?.envolve_fds_feriado_ou_dia_anterior &&
      (!data.justificativas?.justificativa_fds_feriado_dia_anterior ||
       data.justificativas.justificativa_fds_feriado_dia_anterior.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Justificativa deve ter no mínimo 10 caracteres',
      path: ['justificativas', 'justificativa_fds_feriado_dia_anterior'],
    })
  }

  // Fora do prazo: justificativa obrigatória
  if (data.flags?.fora_do_prazo &&
      (!data.justificativas?.justificativa_fora_prazo ||
       data.justificativas.justificativa_fora_prazo.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Justificativa deve ter no mínimo 10 caracteres',
      path: ['justificativas', 'justificativa_fora_prazo'],
    })
  }

  // Justificativas adicionais: se preenchida, mínimo 10 caracteres
  const justFields = [
    { key: 'just_viagem_urgente', label: 'Viagem urgente' },
    { key: 'just_fds_feriado', label: 'Fim de Semana/Feriado' },
    { key: 'just_aeroporto', label: 'Especificação de aeroporto' },
    { key: 'just_grupo_mais_2', label: 'Grupo de mais de 2 pessoas' },
    { key: 'just_grupo_mais_5', label: 'Grupo de mais de 5 pessoas' },
    { key: 'just_mais_30_diarias', label: 'Mais de 30 diárias acumuladas' },
  ] as const

  for (const { key, label } of justFields) {
    const value = (data.justificativas as Record<string, string | undefined> | undefined)?.[key]
    if (value && value.trim().length > 0 && value.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Justificativa "${label}" deve ter no mínimo 10 caracteres`,
        path: ['justificativas', key],
      })
    }
  }
})

export type Anexo1FormData = z.infer<typeof anexo1Schema>
