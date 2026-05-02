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

export const atividadeTabelaSchema = z.object({
  data: z.string().optional(),
  horario: z.string().optional(),
  cidade: z.string().optional(),
  atividades: z.string().optional(),
})

export const alteracaoTabelaSchema = z.object({
  tipo: z.string().optional(),
  descricao: z.string().min(3, 'Mínimo 3 caracteres').optional(),
})

export const anexo2Schema = z.object({
  data_relatorio: z.string().min(1, 'Informe a data'),
  proposto: z.object({
    nome: z.string().min(3, 'Informe o nome completo').max(120, 'Máximo 120 caracteres'),
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos').refine(isCPF, 'CPF inválido'),
    siape: z.string().regex(/^\d{4,15}$/, 'SIAPE deve ter 4 a 15 dígitos'),
    cargo_funcao: z.string().max(80, 'Máximo 80 caracteres').optional(),
    telefone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido').optional(),
    email: z.string().email('E-mail inválido').max(120, 'Máximo 120 caracteres').optional(),
    orgao: z.object({
      tipo: z.enum(['cchsa', 'cavn', 'projetos', 'outros'], {
        message: 'Selecione o órgão',
      }),
      detalhe: z.string().optional(),
    }),
  }),
  afastamento: z.object({
    ida: z.array(trechoSchema).min(1, 'Adicione pelo menos um trecho de ida'),
    retorno: z.array(trechoSchema).min(1, 'Adicione pelo menos um trecho de retorno'),
  }),
  alteracoes_cancelamentos_noshow: z.array(alteracaoTabelaSchema).optional(),
  atividades_tabela: z.array(atividadeTabelaSchema).min(1, 'Adicione pelo menos uma linha na tabela de atividades'),
  flags: z.object({
    prestacao_contas_fora_prazo: z.boolean().optional(),
  }).optional(),
  justificativa_prestacao_contas_fora_prazo: z.string().optional(),
  viagem_realizada: z.enum(['sim', 'nao'], {
    message: 'Informe se a viagem foi realizada',
  }),
}).superRefine((data, ctx) => {
  // Retorno >= Ida
  if (data.afastamento.ida.length && data.afastamento.retorno.length) {
    const idaDate = new Date(data.afastamento.ida[0].data_hora)
    const retDate = new Date(data.afastamento.retorno[data.afastamento.retorno.length - 1].data_hora)
    if (retDate < idaDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Retorno não pode ser anterior à ida',
        path: ['afastamento', 'retorno'],
      })
    }
  }

  // Órgão: projetos/outros precisa de detalhe
  if ((data.proposto.orgao.tipo === 'projetos' || data.proposto.orgao.tipo === 'outros') &&
      (!data.proposto.orgao.detalhe || data.proposto.orgao.detalhe.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe o nome do projeto ou unidade',
      path: ['proposto', 'orgao', 'detalhe'],
    })
  }

  // Fora do prazo: justificativa obrigatória
  if (data.flags?.prestacao_contas_fora_prazo &&
      (!data.justificativa_prestacao_contas_fora_prazo ||
       data.justificativa_prestacao_contas_fora_prazo.length < 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Justificativa deve ter no mínimo 10 caracteres',
      path: ['justificativa_prestacao_contas_fora_prazo'],
    })
  }

  // Tabela de atividades: pelo menos uma linha deve ter atividades preenchidas
  if (data.atividades_tabela.length > 0) {
    const temAtividadeValida = data.atividades_tabela.some(
      (item) => (item.atividades || '').trim().length > 0
    )
    if (!temAtividadeValida) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preencha a descrição das atividades em pelo menos uma linha',
        path: ['atividades_tabela'],
      })
    }
  }

  // === REGRAS DE CIDADE ===
  const ida = data.afastamento.ida
  const ret = data.afastamento.retorno

  // 1) Origem != Destino em cada trecho
  ida.forEach((t, i) => {
    if (t.origem && t.destino && t.origem.trim().toLowerCase() === t.destino.trim().toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A origem e o destino não podem ser a mesma cidade',
        path: ['afastamento', 'ida', i, 'destino'],
      })
    }
  })
  ret.forEach((t, i) => {
    if (t.origem && t.destino && t.origem.trim().toLowerCase() === t.destino.trim().toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A origem e o destino não podem ser a mesma cidade',
        path: ['afastamento', 'retorno', i, 'destino'],
      })
    }
  })

  // 2) Continuidade entre trechos múltiplos
  for (let i = 0; i < ida.length - 1; i++) {
    if (ida[i].destino && ida[i + 1].origem &&
        ida[i].destino.trim().toLowerCase() !== ida[i + 1].origem.trim().toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `O destino do trecho ${i + 1} deve ser a origem do trecho ${i + 2}`,
        path: ['afastamento', 'ida', i + 1, 'origem'],
      })
    }
  }
  for (let i = 0; i < ret.length - 1; i++) {
    if (ret[i].destino && ret[i + 1].origem &&
        ret[i].destino.trim().toLowerCase() !== ret[i + 1].origem.trim().toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `O destino do trecho ${i + 1} deve ser a origem do trecho ${i + 2}`,
        path: ['afastamento', 'retorno', i + 1, 'origem'],
      })
    }
  }

  // 3) Conexão ida-retorno: destino do último ida == origem do primeiro retorno
  if (ida.length && ret.length) {
    const ultimoDestinoIda = ida[ida.length - 1].destino
    const primeiraOrigemRet = ret[0].origem
    if (ultimoDestinoIda && primeiraOrigemRet &&
        ultimoDestinoIda.trim().toLowerCase() !== primeiraOrigemRet.trim().toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O destino da ida deve ser o mesmo que a origem do retorno',
        path: ['afastamento', 'retorno', 0, 'origem'],
      })
    }
  }
})

export type Anexo2FormData = z.infer<typeof anexo2Schema>
