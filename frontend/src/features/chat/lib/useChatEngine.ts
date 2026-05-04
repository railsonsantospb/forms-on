import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatFlowDefinition, ChatStateDefinition, ChatMessage, ChatEngineState } from '../types'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function getQuestion(state: ChatStateDefinition, data: Record<string, unknown>): string {
  return typeof state.question === 'function' ? state.question(data) : state.question
}

function resolveNextState(state: ChatStateDefinition, value: string, data: Record<string, unknown>): string {
  return typeof state.nextState === 'function' ? state.nextState(value, data) : state.nextState
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.')
  const next = { ...obj }
  let current: Record<string, unknown> = next
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    current[k] = { ...(current[k] as Record<string, unknown> || {}) }
    current = current[k] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return next
}

export function useChatEngine(flow: ChatFlowDefinition) {
  const flowRef = useRef(flow)
  const [engineState, setEngineState] = useState<ChatEngineState>(() => {
    const initialState = flow.states.find((s) => s.id === flow.initialState)
    const initialMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: initialState ? getQuestion(initialState, {}) : 'Oi! Sou Dira, sua assistente virtual. Como posso te ajudar hoje?',
      quickOptions: initialState?.options,
      inputMode: initialState?.inputMode,
      timestamp: Date.now(),
      stateId: flow.initialState,
    }
    return {
      currentStateId: flow.initialState,
      messages: [initialMessage],
      data: {},
      isComplete: false,
      error: null,
    }
  })

  // Auto-responde estados com autoValue
  useEffect(() => {
    const stateDef = getStateDef(engineState.currentStateId)
    if (!stateDef || !stateDef.autoValue) return
    const lastMsg = engineState.messages[engineState.messages.length - 1]
    // Evita loop: só processa se a última mensagem foi do assistente (ainda não respondeu)
    if (lastMsg?.role !== 'assistant') return
    const value = typeof stateDef.autoValue === 'function' ? stateDef.autoValue(engineState.data) : stateDef.autoValue
    const timeout = setTimeout(() => {
      processReply(value)
    }, 600)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineState.currentStateId, engineState.messages.length])

  const getStateDef = useCallback(
    (stateId: string): ChatStateDefinition | undefined => {
      return flowRef.current.states.find((s) => s.id === stateId)
    },
    [],
  )

  const processReply = useCallback(
    (rawValue: string) => {
      setEngineState((prev) => {
        if (prev.isComplete) return prev

        const stateDef = getStateDef(prev.currentStateId)
        if (!stateDef) return prev

        const value = rawValue.trim()

        // Validação
        if (stateDef.validation) {
          const error = stateDef.validation(value, prev.data)
          if (error) {
            return { ...prev, error }
          }
        }

        // Atualiza dados (sempre clona para evitar mutação do estado anterior)
        let newData = stateDef.fieldPath
          ? setPath(prev.data, stateDef.fieldPath, value)
          : { ...prev.data }

        // Mensagem do usuário
        const displayValue = stateDef.formatDisplay ? stateDef.formatDisplay(value) : value
        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: displayValue,
          timestamp: Date.now(),
        }

        // Determina próximo estado
        const nextStateId = resolveNextState(stateDef, value, newData)
        let nextStateDef = getStateDef(nextStateId)

        // Se não há próximo estado, completa
        if (!nextStateDef) {
          flowRef.current.onComplete(newData)
          return {
            ...prev,
            data: newData,
            messages: [...prev.messages, userMessage],
            isComplete: true,
            error: null,
          }
        }

        // Pula estados com skipIf
        let finalStateId = nextStateId
        while (nextStateDef?.skipIf?.(newData)) {
          const skipNextId = resolveNextState(nextStateDef, '', newData)
          if (skipNextId === finalStateId) break
          finalStateId = skipNextId
          nextStateDef = getStateDef(finalStateId)
        }

        const finalStateDef = getStateDef(finalStateId)
        if (!finalStateDef) {
          flowRef.current.onComplete(newData)
          return {
            ...prev,
            data: newData,
            messages: [...prev.messages, userMessage],
            isComplete: true,
            error: null,
          }
        }

        // Mensagem do assistente
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: getQuestion(finalStateDef, newData),
          quickOptions: finalStateDef.options,
          inputMode: finalStateDef.inputMode,
          timestamp: Date.now(),
          stateId: finalStateId,
        }

        // Se o estado é final, marca o chat como completo
        if (finalStateDef.isFinal) {
          flowRef.current.onComplete(newData)
          return {
            ...prev,
            currentStateId: finalStateId,
            data: newData,
            messages: [...prev.messages, userMessage, assistantMessage],
            error: null,
            isComplete: true,
          }
        }

        return {
          ...prev,
          currentStateId: finalStateId,
          data: newData,
          messages: [...prev.messages, userMessage, assistantMessage],
          error: null,
        }
      })
    },
    [getStateDef],
  )

  const reset = useCallback(() => {
    const flow = flowRef.current
    const initialState = flow.states.find((s) => s.id === flow.initialState)
    const initialMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: initialState ? getQuestion(initialState, {}) : 'Oi! Sou Dira, sua assistente virtual. Como posso te ajudar hoje?',
      quickOptions: initialState?.options,
      inputMode: initialState?.inputMode,
      timestamp: Date.now(),
      stateId: flow.initialState,
    }
    setEngineState({
      currentStateId: flow.initialState,
      messages: [initialMessage],
      data: {},
      isComplete: false,
      error: null,
    })
  }, [])

  /**
   * Atualiza o valor de um campo já respondido no histórico.
   * Encontra a mensagem do assistant com o stateId, atualiza a mensagem do usuário
   * subsequente e os dados armazenados. Não refaz perguntas.
   */
  const updateFieldValue = useCallback(
    (targetStateId: string, newValue: string): string | null => {
      let validationError: string | null = null

      setEngineState((prev) => {
        const stateDef = getStateDef(targetStateId)
        if (!stateDef) return prev

        const value = newValue.trim()

        // Validação
        if (stateDef.validation) {
          const error = stateDef.validation(value, prev.data)
          if (error) {
            validationError = error
            return prev
          }
        }

        // Atualiza dados
        let newData = prev.data
        if (stateDef.fieldPath) {
          newData = setPath(prev.data, stateDef.fieldPath, value)
        }

        // Encontra mensagem do assistant com esse stateId
        const assistantIdx = prev.messages.findIndex(
          (m) => m.stateId === targetStateId && m.role === 'assistant',
        )
        if (assistantIdx === -1) return prev

        // Encontra a mensagem do usuário logo após (a resposta)
        let userIdx = -1
        for (let i = assistantIdx + 1; i < prev.messages.length; i++) {
          if (prev.messages[i].role === 'user') {
            userIdx = i
            break
          }
        }

        const updatedMessages = [...prev.messages]
        if (userIdx !== -1) {
          const displayValue = stateDef.formatDisplay ? stateDef.formatDisplay(value) : value
          updatedMessages[userIdx] = {
            ...updatedMessages[userIdx],
            content: displayValue,
          }
        }

        return {
          ...prev,
          data: newData,
          messages: updatedMessages,
          error: null,
        }
      })

      return validationError
    },
    [getStateDef],
  )

  return { engineState, processReply, reset, updateFieldValue }
}
