import { describe, it, expect } from 'vitest'
import { anexo2Schema } from '../anexo2.schema'

const validPayload = {
  data_relatorio: '2026-06-01',
  proposto: {
    nome: 'João Silva',
    cpf: '52998224725',
    siape: '1234567',
    cargo_funcao: 'Professor',
    telefone: '83999999999',
    email: 'joao@example.com',
    orgao: { tipo: 'cchsa' },
  },
  afastamento: {
    ida: [{ origem: 'João Pessoa/PB', destino: 'Recife/PE', data_hora: '2026-06-10T08:00:00' }],
    retorno: [{ origem: 'Recife/PE', destino: 'João Pessoa/PB', data_hora: '2026-06-15T18:00:00' }],
  },
  atividades_tabela: [{ data: '2026-06-10', horario: '10:00', cidade: 'Recife/PE', atividades: 'Ministrar palestra institucional.' }],
  viagem_realizada: 'sim',
}

describe('anexo2Schema', () => {
  it('passes with valid payload', () => {
    const result = anexo2Schema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('fails with empty payload', () => {
    const result = anexo2Schema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid CPF', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      proposto: { ...validPayload.proposto, cpf: '11111111111' },
    })
    expect(result.success).toBe(false)
  })

  it('requires detalhe when orgao is projetos', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      proposto: {
        ...validPayload.proposto,
        orgao: { tipo: 'projetos', detalhe: '' },
      },
    })
    expect(result.success).toBe(false)
  })

  it('passes when detalhe is provided for projects orgao', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      proposto: {
        ...validPayload.proposto,
        orgao: { tipo: 'projetos', detalhe: 'Projeto de Extensão Y' },
      },
    })
    expect(result.success).toBe(true)
  })

  it('requires justification when prestacao_contas_fora_prazo is true', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      flags: { prestacao_contas_fora_prazo: true },
      justificativa_prestacao_contas_fora_prazo: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid justification when prestacao_contas_fora_prazo is true', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      flags: { prestacao_contas_fora_prazo: true },
      justificativa_prestacao_contas_fora_prazo: 'Justificativa de atraso com mais de dez caracteres.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects trechos with same origin and destination', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      afastamento: {
        ida: [{ origem: 'Recife/PE', destino: 'Recife/PE', data_hora: '2026-06-10T08:00:00' }],
        retorno: [{ origem: 'Recife/PE', destino: 'João Pessoa/PB', data_hora: '2026-06-15T18:00:00' }],
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects disconnected ida and retorno trechos', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      afastamento: {
        ida: [{ origem: 'João Pessoa/PB', destino: 'Recife/PE', data_hora: '2026-06-10T08:00:00' }],
        retorno: [{ origem: 'Natal/RN', destino: 'João Pessoa/PB', data_hora: '2026-06-15T18:00:00' }],
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty activities list', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      atividades_tabela: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects activities table when no rows have content', () => {
    const result = anexo2Schema.safeParse({
      ...validPayload,
      atividades_tabela: [{ data: '2026-06-10', horario: '10:00', cidade: 'Recife/PE', atividades: '' }],
    })
    expect(result.success).toBe(false)
  })
})
