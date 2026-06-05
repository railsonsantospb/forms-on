import { create } from 'zustand'
import type { Anexo2Payload } from '@/types'
import { todayISO } from '@/lib/dates'
import type { ChatEngineState } from '@/features/chat/types'

const TOTAL_STEPS = 7

export const defaultFormData: Partial<Anexo2Payload> = {
  data_relatorio: todayISO(),
  proposto: {
    nome: '',
    cpf: '',
    siape: '',
    orgao: { tipo: 'cchsa' },
  },
  afastamento: { ida: [{ origem: '', destino: '', data_hora: '' }], retorno: [{ origem: '', destino: '', data_hora: '' }] },
  viagem_realizada: 'sim',
  atividades_tabela: [{ data: '', horario: '', cidade: '', atividades: '' }],
  alteracoes_cancelamentos_noshow: [{ tipo: '', descricao: '' }],
  flags: {},
}

interface Anexo2WizardState {
  currentStep: number
  totalSteps: number
  formData: Partial<Anexo2Payload>
  stepValidation: Record<number, boolean>
  autoFlags: { foraDoPrazo: boolean }
  isChatOpen: boolean
  chatState: ChatEngineState | null

  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setFieldValue: (path: string, value: unknown) => void
  addTrecho: (type: 'ida' | 'retorno') => void
  removeTrecho: (type: 'ida' | 'retorno', index: number) => void
  updateTrecho: (type: 'ida' | 'retorno', index: number, field: string, value: string) => void
  addAtividade: () => void
  removeAtividade: (index: number) => void
  updateAtividade: (index: number, field: string, value: string) => void
  addAlteracao: () => void
  removeAlteracao: (index: number) => void
  updateAlteracao: (index: number, field: string, value: string) => void
  setAutoFlags: (flags: { foraDoPrazo: boolean }) => void
  setStepValidation: (step: number, valid: boolean) => void
  setChatOpen: (open: boolean) => void
  setChatState: (state: ChatEngineState | ((prev: ChatEngineState | null) => ChatEngineState)) => void
  resetChatState: () => void
  applyPayload: (payload: Partial<Anexo2Payload>) => void
  reset: () => void
}

import { setPath } from '@/lib/object-utils'

export const useAnexo2WizardStore = create<Anexo2WizardState>((set) => ({
  currentStep: 1,
  totalSteps: TOTAL_STEPS,
  formData: defaultFormData,
  stepValidation: {},
  autoFlags: { foraDoPrazo: false },
  isChatOpen: false,
  chatState: null,

  goToStep: (step) => set({ currentStep: Math.max(1, Math.min(TOTAL_STEPS, step)) }),
  nextStep: () => set((s) => ({ currentStep: Math.min(TOTAL_STEPS, s.currentStep + 1) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),

  setFieldValue: (path, value) =>
    set((s) => ({ formData: setPath(s.formData as Record<string, unknown>, path, value) })),

  addTrecho: (type) =>
    set((s) => {
      const afastamento = { ...(s.formData.afastamento || { ida: [], retorno: [] }) }
      afastamento[type] = [...(afastamento[type] || []), { origem: '', destino: '', data_hora: '' }]
      return { formData: { ...s.formData, afastamento } }
    }),

  removeTrecho: (type, index) =>
    set((s) => {
      const afastamento = { ...(s.formData.afastamento || { ida: [], retorno: [] }) }
      if (afastamento[type].length <= 1) return s
      afastamento[type] = afastamento[type].filter((_, i) => i !== index)
      return { formData: { ...s.formData, afastamento } }
    }),

  updateTrecho: (type, index, field, value) =>
    set((s) => {
      const afastamento = { ...(s.formData.afastamento || { ida: [], retorno: [] }) }
      afastamento[type] = afastamento[type].map((t, i) => (i === index ? { ...t, [field]: value } : t))
      return { formData: { ...s.formData, afastamento } }
    }),

  addAtividade: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        atividades_tabela: [...(s.formData.atividades_tabela || []), { data: '', horario: '', cidade: '', atividades: '' }],
      },
    })),

  removeAtividade: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        atividades_tabela: (s.formData.atividades_tabela || []).filter((_, i) => i !== index),
      },
    })),

  updateAtividade: (index, field, value) =>
    set((s) => ({
      formData: {
        ...s.formData,
        atividades_tabela: (s.formData.atividades_tabela || []).map((row, i) =>
          i === index ? { ...row, [field]: value } : row
        ),
      },
    })),

  addAlteracao: () =>
    set((s) => ({
      formData: {
        ...s.formData,
        alteracoes_cancelamentos_noshow: [...(s.formData.alteracoes_cancelamentos_noshow || []), { tipo: '', descricao: '' }],
      },
    })),

  removeAlteracao: (index) =>
    set((s) => ({
      formData: {
        ...s.formData,
        alteracoes_cancelamentos_noshow: (s.formData.alteracoes_cancelamentos_noshow || []).filter((_, i) => i !== index),
      },
    })),

  updateAlteracao: (index, field, value) =>
    set((s) => ({
      formData: {
        ...s.formData,
        alteracoes_cancelamentos_noshow: (s.formData.alteracoes_cancelamentos_noshow || []).map((row, i) =>
          i === index ? { ...row, [field]: value } : row
        ),
      },
    })),

  setAutoFlags: (flags) => set({ autoFlags: flags }),

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
      autoFlags: { foraDoPrazo: false },
      isChatOpen: false,
      chatState: null,
    }),
}))
