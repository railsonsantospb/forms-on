export type ChatInputMode = 'text' | 'date' | 'datetime' | 'quick'

export interface ChatQuickOption {
  label: string
  value: string
  nextState?: string
  variant?: 'default' | 'primary'
}

export interface ChatStateDefinition {
  id: string
  question: string | ((data: Record<string, unknown>) => string)
  inputMode: ChatInputMode
  options?: ChatQuickOption[]
  validation?: (value: string, data: Record<string, unknown>) => string | null
  nextState: string | ((value: string, data: Record<string, unknown>) => string)
  fieldPath?: string
  allowEmpty?: boolean
  skipIf?: (data: Record<string, unknown>) => boolean
  autoValue?: string | ((data: Record<string, unknown>) => string)
  formatDisplay?: (value: string) => string
  isFinal?: boolean
}

export interface ChatFlowDefinition {
  states: ChatStateDefinition[]
  initialState: string
  onComplete: (data: Record<string, unknown>) => void
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  meta?: string
  quickOptions?: ChatQuickOption[]
  inputMode?: ChatInputMode
  timestamp: number
  stateId?: string
}

export interface ChatEngineState {
  currentStateId: string
  messages: ChatMessage[]
  data: Record<string, unknown>
  isComplete: boolean
  error: string | null
}
