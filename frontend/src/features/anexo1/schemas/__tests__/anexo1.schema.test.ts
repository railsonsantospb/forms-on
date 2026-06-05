import { describe, it, expect } from 'vitest'
import { anexo1Schema } from '../anexo1.schema'

const validPayload = {
  tipo_solicitacao: 'diarias',
  data_solicitacao: '2026-06-01',
  servidor: {
    nome_completo: 'João Silva',
    cargo_funcao: 'Professor',
    cpf: '52998224725',
    rg: '1234567',
    data_nascimento: '1980-05-15',
    siape: '1234567',
    nome_mae: 'Maria Silva',
    endereco: 'Rua ABC, 123',
    telefone: '83999999999',
    email: 'joao@example.com',
    dados_bancarios: { banco: 'Banco do Brasil', agencia: '1234', conta: '56789' },
    tipo_vinculo: 'servidor',
    lotacao_orgao: 'CCHSA',
  },
  motivo_viagem: 'Participação em congresso internacional sobre educação inclusiva',
  relacao_pertinencia: 'O congresso está diretamente relacionado às atividades do servidor no CCHSA',
  trechos: { ida: [{ origem: 'João Pessoa/PB', destino: 'Recife/PE', data_hora: '2026-06-10T08:00:00' }], retorno: [{ origem: 'Recife/PE', destino: 'João Pessoa/PB', data_hora: '2026-06-15T18:00:00' }] },
  missao: { inicio_data_hora: '2026-06-10T08:00:00', termino_data_hora: '2026-06-15T18:00:00' },
  debito_recurso: { tipo: 'cchsa' },
  transporte: { meios: ['veiculo_oficial'] },
}

describe('anexo1Schema', () => {
  it('passes with valid payload', () => {
    const result = anexo1Schema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('fails with empty payload', () => {
    const result = anexo1Schema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid CPF', () => {
    const result = anexo1Schema.safeParse({ ...validPayload, servidor: { ...validPayload.servidor, cpf: '11111111111' } })
    expect(result.success).toBe(false)
  })

  it('rejects future data_nascimento', () => {
    const result = anexo1Schema.safeParse({ ...validPayload, servidor: { ...validPayload.servidor, data_nascimento: '2099-01-01' } })
    expect(result.success).toBe(false)
  })

  it('rejects data_nascimento before 1920', () => {
    const result = anexo1Schema.safeParse({ ...validPayload, servidor: { ...validPayload.servidor, data_nascimento: '1910-01-01' } })
    expect(result.success).toBe(false)
  })

  it('rejects reversed trecho sequence', () => {
    const payload = { ...validPayload, trechos: { ida: [{ origem: 'JP/PB', destino: 'Recife/PE', data_hora: '2026-06-15T18:00:00' }], retorno: [{ origem: 'Recife/PE', destino: 'JP/PB', data_hora: '2026-06-10T08:00:00' }] } }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects mismatched ida destination and retorno origin even with other invalid fields', () => {
    const payload = {
      ...validPayload,
      motivo_viagem: '', // invalid
      relacao_pertinencia: undefined, // invalid
      missao: { inicio_data_hora: '', termino_data_hora: '' }, // invalid
      trechos: {
        ida: [{ origem: 'João Pessoa/PB', destino: 'Recife/PE', data_hora: '2026-06-10T08:00:00' }],
        retorno: [{ origem: 'Natal/RN', destino: 'João Pessoa/PB', data_hora: '2026-06-15T18:00:00' }]
      }
    }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.join('.') === 'trechos.retorno.0.origem')
      expect(issue).toBeDefined()
      expect(issue?.message).toBe('O destino da ida deve ser o mesmo que a origem do retorno')
    }
  })




  it('requires especificar when vinculo is outro', () => {
    const payload = { ...validPayload, servidor: { ...validPayload.servidor, tipo_vinculo: 'outro', vinculo_outro_especificar: '', lotacao_orgao: undefined } }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('requires lotacao_orgao when vinculo is servidor', () => {
    const payload = { ...validPayload, servidor: { ...validPayload.servidor, lotacao_orgao: '' } }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('requires termo_veiculo_proprio when using veiculo_proprio', () => {
    const payload = { ...validPayload, transporte: { meios: ['veiculo_proprio'] } }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects motivo_viagem with less than 20 chars', () => {
    const payload = { ...validPayload, motivo_viagem: 'Curto' }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects relacao_pertinencia with less than 10 chars', () => {
    const payload = { ...validPayload, relacao_pertinencia: 'Curto' }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects servidor without nome_completo', () => {
    const payload = { ...validPayload, servidor: { ...validPayload.servidor, nome_completo: 'AB' } }
    const result = anexo1Schema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})
