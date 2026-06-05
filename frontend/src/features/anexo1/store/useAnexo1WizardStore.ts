import { create } from 'zustand'
import type { Anexo1Payload } from '@/types'
import { todayISO } from '@/lib/dates'
import { setPath } from '@/lib/object-utils'
import type { ChatEngineState } from '@/features/chat/types'

const TOTAL_STEPS = 9

export const defaultFormData: Partial<Anexo1Payload> = {
  tipo_solicitacao: 'diarias',
  data_solicitacao: todayISO(),
  servidor: {
    nome_completo: '',
    cargo_funcao: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    siape: '',
    nome_mae: '',
    endereco: '',
    telefone: '',
    email: '',
    dados_bancarios: { banco: '', agencia: '', conta: '' },
  },
  motivo_viagem: '',
  trechos: { ida: [{ origem: '', destino: '', data_hora: '' }], retorno: [{ origem: '', destino: '', data_hora: '' }] },
  missao: { inicio_data_hora: '', termino_data_hora: '' },
  debito_recurso: { tipo: 'cchsa' },
  transporte: { meios: [] },
  flags: {},
  justificativas: {},
}

interface Anexo1WizardState {
  currentStep: number
  totalSteps: number
  formData: Partial<Anexo1Payload>
  stepValidation: Record<number, boolean>
  autoFlags: { foraDoPrazo: boolean; fds: boolean }
  isChatOpen: boolean
  chatState: ChatEngineState | null

  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setFieldValue: (path: string, value: unknown) => void
  setNestedValue: (path: string, value: unknown) => void
  addTrecho: (type: 'ida' | 'retorno') => void
  removeTrecho: (type: 'ida' | 'retorno', index: number) => void
  updateTrecho: (type: 'ida' | 'retorno', index: number, field: string, value: string) => void
  toggleTransporte: (meio: string) => void
  setAutoFlags: (flags: { foraDoPrazo: boolean; fds: boolean }) => void
  setStepValidation: (step: number, valid: boolean) => void
  setChatOpen: (open: boolean) => void
  setChatState: (state: ChatEngineState | ((prev: ChatEngineState | null) => ChatEngineState)) => void
  resetChatState: () => void
  applyPayload: (payload: Partial<Anexo1Payload>) => void
  reset: () => void
}

export const useAnexo1WizardStore = create<Anexo1WizardState>((set) => ({
  currentStep: 1,
  totalSteps: TOTAL_STEPS,
  formData: defaultFormData,
  stepValidation: {},
  autoFlags: { foraDoPrazo: false, fds: false },
  isChatOpen: false,
  chatState: null,

  goToStep: (step) => set({ currentStep: Math.max(1, Math.min(TOTAL_STEPS, step)) }),
  nextStep: () => set((s) => ({ currentStep: Math.min(TOTAL_STEPS, s.currentStep + 1) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),

  setFieldValue: (path, value) =>
    set((s) => ({ formData: setPath(s.formData as Record<string, unknown>, path, value) })),

  setNestedValue: (path, value) =>
    set((s) => ({ formData: setPath(s.formData as Record<string, unknown>, path, value) })),

  addTrecho: (type) =>
    set((s) => {
      const trechos = { ...(s.formData.trechos || { ida: [], retorno: [] }) }
      trechos[type] = [...(trechos[type] || []), { origem: '', destino: '', data_hora: '' }]
      return { formData: { ...s.formData, trechos } }
    }),

  removeTrecho: (type, index) =>
    set((s) => {
      const trechos = { ...(s.formData.trechos || { ida: [], retorno: [] }) }
      if (trechos[type].length <= 1) return s
      trechos[type] = trechos[type].filter((_, i) => i !== index)
      return { formData: { ...s.formData, trechos } }
    }),

  updateTrecho: (type, index, field, value) =>
    set((s) => {
      const trechos = { ...(s.formData.trechos || { ida: [], retorno: [] }) }
      trechos[type] = trechos[type].map((t, i) => (i === index ? { ...t, [field]: value } : t))
      return { formData: { ...s.formData, trechos } }
    }),

  toggleTransporte: (meio: string) =>
    set((s) => {
      const currentMeios = (s.formData.transporte?.meios || []) as string[]
      const meios = new Set<string>(currentMeios)
      if (meios.has(meio)) meios.delete(meio)
      else meios.add(meio)
      const transporte: Record<string, unknown> = { ...(s.formData.transporte || {}), meios: Array.from(meios) }
      if (!meios.has('veiculo_proprio')) {
        delete transporte.termo_veiculo_proprio_ciente
        delete transporte.distancia_km
      }
      return { formData: { ...s.formData, transporte: transporte as Anexo1Payload['transporte'] } }
    }),

  setAutoFlags: (flags) =>
    set((s) => {
      if (s.autoFlags.foraDoPrazo === flags.foraDoPrazo && s.autoFlags.fds === flags.fds) {
        return {}
      }
      return { autoFlags: flags }
    }),

  setStepValidation: (step, valid) =>
    set((s) => ({ stepValidation: { ...s.stepValidation, [step]: valid } })),

  setChatOpen: (open) => set({ isChatOpen: open }),

  setChatState: (state) =>
    set((s) => ({
      chatState: typeof state === 'function' ? state(s.chatState) : state,
    })),

  resetChatState: () => set({ chatState: null }),

  applyPayload: (payload) =>
    set((s) => ({ formData: { ...s.formData, ...payload } })),

  reset: () =>
    set({
      currentStep: 1,
      formData: defaultFormData,
      stepValidation: {},
      autoFlags: { foraDoPrazo: false, fds: false },
      isChatOpen: false,
      chatState: null,
    }),
}))
