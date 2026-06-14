import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { X, Send, Calendar, Clock, Pencil, CheckCircle2 } from 'lucide-react'
import { useChatEngine } from '../lib/useChatEngine'
import type { ChatFlowDefinition, ChatStateDefinition, ChatEngineState } from '../types'
import { Button } from '@/components/ui/button'

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  flow: ChatFlowDefinition
  onApply: (data: Record<string, unknown>) => void
  title?: string
  externalState?: ChatEngineState | null
  setExternalState?: (state: ChatEngineState | ((prev: ChatEngineState | null) => ChatEngineState)) => void
}

function getFieldTitle(stateDef: ChatStateDefinition | undefined): string {
  if (!stateDef) return 'Editar campo'
  const q = typeof stateDef.question === 'function' ? 'Campo' : stateDef.question
  // Pega apenas a primeira frase para o título
  return q.split(/[.?!]/)[0].trim() || 'Editar campo'
}

function getPathValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[k]
    } else {
      return undefined
    }
  }
  return current
}

export function ChatModal({ isOpen, onClose, flow, onApply, title = 'Assistente Virtual', externalState, setExternalState }: ChatModalProps) {
  const { engineState, processReply, reset, updateFieldValue } = useChatEngine(flow, externalState, setExternalState)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(0)
  const [textInput, setTextInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [dtInput, setDtInput] = useState('')

  // Estado do modal de edição inline
  const [editingStateId, setEditingStateId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  // Navegação por teclado nas opções quick
  const [focusedQuickIndex, setFocusedQuickIndex] = useState(0)
  const currentStateDef = flow.states.find((s) => s.id === engineState.currentStateId)
  const inputMode = currentStateDef?.inputMode || 'text'
  const currentOptions = useMemo(
    () => currentStateDef?.options ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engineState.currentStateId, flow.states],
  )

  useEffect(() => {
    // Quando há erro, scrolla para o erro ficar visível.
    // Quando há nova mensagem, scrolla para o final.
    if (engineState.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [engineState.messages, engineState.error])

  // Limpa os inputs somente quando uma nova mensagem é adicionada com sucesso.
  // Se houve erro de validação, o número de mensagens não muda e o input permanece.
  useEffect(() => {
    if (engineState.messages.length > prevMessageCount.current) {
      setTextInput('')
      setDateInput('')
      setDtInput('')
    }
    prevMessageCount.current = engineState.messages.length
  }, [engineState.messages.length])

  useEffect(() => {
    if (isOpen) {
      if (!externalState) {
        reset()
      }
      prevMessageCount.current = engineState.messages.length
      setTextInput('')
      setDateInput('')
      setDtInput('')
      setEditingStateId(null)
      setEditValue('')
      setEditError(null)
    }
  }, [isOpen, reset, externalState, engineState.messages.length])

  // Reseta o foco ao entrar em um novo estado
  useEffect(() => {
    setFocusedQuickIndex(0)
  }, [engineState.currentStateId])

  const handleQuick = useCallback((value: string) => {
    processReply(value)
  }, [processReply])

  // Navegação por teclado nas opções quick — deve ficar antes do early return
  useEffect(() => {
    if (!isOpen || inputMode !== 'quick' || engineState.isComplete || currentOptions.length === 0) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedQuickIndex((i) => (i + 1) % currentOptions.length)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedQuickIndex((i) => (i - 1 + currentOptions.length) % currentOptions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        setFocusedQuickIndex((i) => { handleQuick(currentOptions[i].value); return i })
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, inputMode, currentOptions, engineState.isComplete, handleQuick])

  if (!isOpen) return null

  const handleSend = () => {
    const allowEmpty = currentStateDef?.allowEmpty ?? false
    if (!textInput.trim() && !allowEmpty) return
    processReply(textInput)
  }

  const handleDateSend = () => {
    if (!dateInput) return
    processReply(dateInput)
  }

  const handleDTSend = () => {
    if (!dtInput) return
    processReply(dtInput + ':00')
  }

  const openEditModal = (stateId: string | undefined) => {
    if (!stateId) return
    const stateDef = flow.states.find((s) => s.id === stateId)
    if (!stateDef) return

    // Valor atual bruto dos dados
    let currentValue = ''
    if (stateDef.fieldPath) {
      const raw = getPathValue(engineState.data, stateDef.fieldPath)
      currentValue = raw != null ? String(raw) : ''
    }

    // Para datetime, precisamos do formato yyyy-MM-ddTHH:mm para o input
    if (stateDef.inputMode === 'datetime' && currentValue) {
      // O valor armazenado é ISO completo com :00 no final
      currentValue = currentValue.slice(0, 16) // yyyy-MM-ddTHH:mm
    }

    setEditingStateId(stateId)
    setEditValue(currentValue)
    setEditError(null)
  }

  const closeEditModal = () => {
    setEditingStateId(null)
    setEditValue('')
    setEditError(null)
  }

  const handleEditSave = () => {
    if (!editingStateId) return
    const stateDef = flow.states.find((s) => s.id === editingStateId)
    if (!stateDef) return

    const allowEmpty = stateDef.allowEmpty ?? false
    if (!editValue.trim() && !allowEmpty) {
      setEditError('Este campo não pode ficar em branco.')
      return
    }

    let valueToSave = editValue.trim()
    if (stateDef.inputMode === 'datetime') {
      valueToSave = valueToSave + ':00'
    }

    const error = updateFieldValue(editingStateId, valueToSave)
    if (error) {
      setEditError(error)
      return
    }

    closeEditModal()
  }

  const handleApply = () => {
    onApply(engineState.data)
    onClose()
  }

  const editingStateDef = editingStateId
    ? flow.states.find((s) => s.id === editingStateId)
    : undefined
  const editingInputMode = editingStateDef?.inputMode || 'text'
  const editingTitle = getFieldTitle(editingStateDef)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-2xl h-[80vh] flex flex-col bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-[11px] text-[var(--color-subtle)]">
              Os dados ficam no navegador e só vão ao servidor quando você pedir para gerar o arquivo.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col justify-end min-h-full space-y-4">
          {engineState.messages.map((msg, index) => {
            const isLastAssistant = msg.role === 'assistant' && index === engineState.messages.length - 1
            return (
            <div key={msg.id} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm relative group ${
                  msg.role === 'assistant'
                    ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-sm'
                    : 'bg-[var(--color-accent)] text-white rounded-tr-sm'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.meta && <p className="text-[11px] opacity-70 mt-1">{msg.meta}</p>}

                {/* Quick options */}
                {msg.quickOptions && msg.quickOptions.length > 0 && msg.role === 'assistant' && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.quickOptions.map((opt, optIdx) => {
                      const isFocused = isLastAssistant && !engineState.isComplete && focusedQuickIndex === optIdx
                      const isPrimary = opt.variant === 'primary'
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleQuick(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isPrimary
                              ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90'
                              : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'
                          } ${isFocused ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 scale-105' : ''}`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Edit button for past assistant messages */}
                {msg.role === 'assistant' && msg.stateId && index < engineState.messages.length - 1 && !engineState.isComplete && (
                  <button
                    onClick={() => openEditModal(msg.stateId)}
                    className="absolute -right-8 top-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-muted)] hover:text-[var(--color-accent)]"
                    title="Editar resposta"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>
            )
          })}

          {engineState.error && (
            <div ref={errorRef} className="flex justify-center">
              <span className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-1.5 rounded-lg">
                {engineState.error}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {engineState.isComplete ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-[var(--color-subtle)] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-green-500" />
                Preenchimento concluído!
              </p>
              <Button variant="primary" size="lg" onClick={handleApply} className="w-full">
                Aplicar dados no formulário
              </Button>
            </div>
          ) : (
            <>
            {inputMode === 'quick' && (
              <p className="text-xs text-[var(--color-subtle)] text-center">
                Clique numa opção ↑ &nbsp;·&nbsp; <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] text-[10px]">↑↓</kbd> navegar &nbsp;·&nbsp; <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] text-[10px]">Enter</kbd> selecionar
              </p>
            )}

            {inputMode === 'text' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua resposta..."
                  className="flex-1 rounded-xl border border-[var(--color-field-border)] bg-[var(--color-field-bg)] text-[var(--color-text)] placeholder:text-[var(--color-field-placeholder)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]/50"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  className="p-2.5 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            )}

            {inputMode === 'date' && (
              <div className="flex gap-2 items-center">
                <Calendar size={16} className="text-[var(--color-subtle)]" />
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--color-field-border)] bg-[var(--color-field-bg)] text-[var(--color-text)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]/50"
                  autoFocus
                />
                <button
                  onClick={handleDateSend}
                  className="p-2.5 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            )}

            {inputMode === 'datetime' && (
              <div className="flex gap-2 items-center">
                <Clock size={16} className="text-[var(--color-subtle)]" />
                <input
                  type="datetime-local"
                  value={dtInput}
                  onChange={(e) => setDtInput(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--color-field-border)] bg-[var(--color-field-bg)] text-[var(--color-text)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]/50"
                  autoFocus
                />
                <button
                  onClick={handleDTSend}
                  className="p-2.5 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Modal de edição inline */}
      {editingStateId && editingStateDef && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden">
            {/* Header do modal de edição */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <h4 className="font-semibold text-sm">✏️ Editar resposta</h4>
              <button
                onClick={closeEditModal}
                className="p-1.5 rounded-lg hover:bg-[var(--color-btn-hover)] text-[var(--color-muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs text-[var(--color-subtle)] mb-1">Campo</p>
                <p className="text-sm font-medium text-[var(--color-text)]">{editingTitle}</p>
              </div>

              <div>
                <p className="text-xs text-[var(--color-subtle)] mb-1.5">Novo valor</p>

                {editingInputMode === 'text' && (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => { setEditValue(e.target.value); setEditError(null) }}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                    placeholder="Digite o novo valor..."
                    className="w-full rounded-xl border border-[var(--color-field-border)] bg-[var(--color-field-bg)] text-[var(--color-text)] placeholder:text-[var(--color-field-placeholder)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]/50"
                    autoFocus
                  />
                )}

                {editingInputMode === 'date' && (
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => { setEditValue(e.target.value); setEditError(null) }}
                    className="w-full rounded-xl border border-[var(--color-field-border)] bg-[var(--color-field-bg)] text-[var(--color-text)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]/50"
                    autoFocus
                  />
                )}

                {editingInputMode === 'datetime' && (
                  <input
                    type="datetime-local"
                    value={editValue}
                    onChange={(e) => { setEditValue(e.target.value); setEditError(null) }}
                    className="w-full rounded-xl border border-[var(--color-field-border)] bg-[var(--color-field-bg)] text-[var(--color-text)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]/50"
                    autoFocus
                  />
                )}

                {editingInputMode === 'quick' && (
                  <div className="flex flex-wrap gap-2">
                    {editingStateDef.options?.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setEditValue(opt.value); setEditError(null) }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          editValue === opt.value
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {editError && (
                <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 rounded-lg">
                  {editError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <Button variant="ghost" size="sm" onClick={closeEditModal}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleEditSave}>
                Salvar alteração
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
