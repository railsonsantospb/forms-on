import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useChatEngine } from '../useChatEngine'
import type { ChatFlowDefinition } from '../../types'

function createTestFlow(): ChatFlowDefinition {
  return {
    states: [
      { id: 'start', question: 'Qual seu nome?', inputMode: 'text', nextState: 'idade', fieldPath: 'nome', validation: (v) => v.length < 2 ? 'Mínimo 2 caracteres' : null },
      { id: 'idade', question: 'Qual sua idade?', inputMode: 'text', nextState: 'end', fieldPath: 'idade', validation: (v) => { const n = parseInt(v); return isNaN(n) || n < 0 || n > 150 ? 'Idade inválida' : null } },
      { id: 'end', question: 'Obrigado!', inputMode: 'text', nextState: '', fieldPath: '', isFinal: true },
    ],
    initialState: 'start',
    onComplete: () => {},
  }
}

describe('useChatEngine', () => {
  it('initializes with assistant message', () => {
    const flow = createTestFlow()
    const { result } = renderHook(() => useChatEngine(flow))
    expect(result.current.engineState.currentStateId).toBe('start')
    expect(result.current.engineState.messages).toHaveLength(1)
    expect(result.current.engineState.messages[0].role).toBe('assistant')
    expect(result.current.engineState.messages[0].content).toBe('Qual seu nome?')
    expect(result.current.engineState.isComplete).toBe(false)
    expect(result.current.engineState.error).toBeNull()
  })

  it('advances to next state on valid reply', () => {
    const flow = createTestFlow()
    const { result } = renderHook(() => useChatEngine(flow))
    act(() => { result.current.processReply('João') })
    expect(result.current.engineState.currentStateId).toBe('idade')
    expect(result.current.engineState.messages).toHaveLength(3)
    expect(result.current.engineState.messages[1].role).toBe('user')
    expect(result.current.engineState.messages[1].content).toBe('João')
    expect(result.current.engineState.data.nome).toBe('João')
    expect(result.current.engineState.error).toBeNull()
  })

  it('shows validation error for invalid input', () => {
    const flow = createTestFlow()
    const { result } = renderHook(() => useChatEngine(flow))
    act(() => { result.current.processReply('A') })
    expect(result.current.engineState.currentStateId).toBe('start')
    expect(result.current.engineState.error).toBe('Mínimo 2 caracteres')
    expect(result.current.engineState.messages).toHaveLength(1)
  })

  it('handles skipIf correctly', () => {
    const flow: ChatFlowDefinition = {
      states: [
        { id: 'tem_carro', question: 'Tem carro?', inputMode: 'quick', nextState: 'modelo', fieldPath: 'tem_carro', options: [{ label: 'Sim', value: 'sim', nextState: 'modelo' }, { label: 'Não', value: 'nao', nextState: 'fim' }] },
        { id: 'modelo', question: 'Qual o modelo?', inputMode: 'text', nextState: 'fim', fieldPath: 'modelo', skipIf: (d) => d.tem_carro === 'nao' },
        { id: 'fim', question: 'Pronto!', inputMode: 'text', nextState: '', isFinal: true },
      ],
      initialState: 'tem_carro',
      onComplete: () => {},
    }
    const { result } = renderHook(() => useChatEngine(flow))
    act(() => { result.current.processReply('nao') })
    expect(result.current.engineState.currentStateId).toBe('fim')
    expect(result.current.engineState.data.modelo).toBeUndefined()
  })

  it('marks complete on final state', () => {
    const flow = createTestFlow()
    const { result } = renderHook(() => useChatEngine(flow))
    act(() => { result.current.processReply('João') })
    act(() => { result.current.processReply('25') })
    expect(result.current.engineState.isComplete).toBe(true)
  })

  it('updateFieldValue updates existing field', () => {
    const flow = createTestFlow()
    const { result } = renderHook(() => useChatEngine(flow))
    act(() => { result.current.processReply('João') })
    act(() => { result.current.updateFieldValue('start', 'Maria') })
    expect(result.current.engineState.data.nome).toBe('Maria')
  })

  it('reset returns to initial state', () => {
    const flow = createTestFlow()
    const { result } = renderHook(() => useChatEngine(flow))
    act(() => { result.current.processReply('João') })
    act(() => { result.current.reset() })
    expect(result.current.engineState.currentStateId).toBe('start')
    expect(result.current.engineState.messages).toHaveLength(1)
    expect(result.current.engineState.data).toEqual({})
    expect(result.current.engineState.isComplete).toBe(false)
  })
})
