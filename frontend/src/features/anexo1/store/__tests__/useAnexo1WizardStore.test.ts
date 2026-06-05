import { describe, it, expect, beforeEach } from 'vitest'
import { useAnexo1WizardStore, defaultFormData } from '../useAnexo1WizardStore'

beforeEach(() => {
  useAnexo1WizardStore.setState({
    currentStep: 1,
    formData: { ...defaultFormData },
    stepValidation: {},
    autoFlags: { foraDoPrazo: false, fds: false },
    isChatOpen: false,
    chatState: null,
  })
})

describe('useAnexo1WizardStore', () => {
  it('initializes with step 1', () => {
    const state = useAnexo1WizardStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.totalSteps).toBe(9)
  })

  it('goToStep clamps within valid range', () => {
    const { goToStep } = useAnexo1WizardStore.getState()
    goToStep(0)
    expect(useAnexo1WizardStore.getState().currentStep).toBe(1)
    goToStep(10)
    expect(useAnexo1WizardStore.getState().currentStep).toBe(9)
    goToStep(5)
    expect(useAnexo1WizardStore.getState().currentStep).toBe(5)
  })

  it('nextStep advances one step without exceeding total', () => {
    const { nextStep } = useAnexo1WizardStore.getState()
    expect(useAnexo1WizardStore.getState().currentStep).toBe(1)
    nextStep()
    expect(useAnexo1WizardStore.getState().currentStep).toBe(2)
    useAnexo1WizardStore.setState({ currentStep: 9 })
    nextStep()
    expect(useAnexo1WizardStore.getState().currentStep).toBe(9)
  })

  it('prevStep goes back one step without going below 1', () => {
    useAnexo1WizardStore.setState({ currentStep: 3 })
    const { prevStep } = useAnexo1WizardStore.getState()
    prevStep()
    expect(useAnexo1WizardStore.getState().currentStep).toBe(2)
    useAnexo1WizardStore.setState({ currentStep: 1 })
    prevStep()
    expect(useAnexo1WizardStore.getState().currentStep).toBe(1)
  })

  it('setFieldValue updates a nested field via dot path', () => {
    const { setFieldValue } = useAnexo1WizardStore.getState()
    setFieldValue('servidor.nome_completo', 'João Teste')
    const formData = useAnexo1WizardStore.getState().formData
    expect(formData.servidor?.nome_completo).toBe('João Teste')
  })

  it('setFieldValue updates a top-level field', () => {
    const { setFieldValue } = useAnexo1WizardStore.getState()
    setFieldValue('motivo_viagem', 'Teste de motivo')
    expect(useAnexo1WizardStore.getState().formData.motivo_viagem).toBe('Teste de motivo')
  })

  it('addTrecho appends an empty trecho', () => {
    const { addTrecho } = useAnexo1WizardStore.getState()
    addTrecho('ida')
    const ida = useAnexo1WizardStore.getState().formData.trechos?.ida
    expect(ida).toHaveLength(2)
    expect(ida?.[1]).toEqual({ origem: '', destino: '', data_hora: '' })
  })

  it('removeTrecho does not go below 1 trecho', () => {
    const { removeTrecho } = useAnexo1WizardStore.getState()
    removeTrecho('ida', 0)
    const ida = useAnexo1WizardStore.getState().formData.trechos?.ida
    expect(ida).toHaveLength(1)
  })

  it('updateTrecho modifies a specific field in a trecho', () => {
    const { updateTrecho } = useAnexo1WizardStore.getState()
    updateTrecho('ida', 0, 'origem', 'João Pessoa/PB')
    const trecho = useAnexo1WizardStore.getState().formData.trechos?.ida?.[0]
    expect(trecho?.origem).toBe('João Pessoa/PB')
    expect(trecho?.destino).toBe('')
  })

  it('toggleTransporte adds and removes meios', () => {
    const { toggleTransporte } = useAnexo1WizardStore.getState()
    toggleTransporte('veiculo_oficial')
    let meios = useAnexo1WizardStore.getState().formData.transporte?.meios
    expect(meios).toContain('veiculo_oficial')

    toggleTransporte('veiculo_oficial')
    meios = useAnexo1WizardStore.getState().formData.transporte?.meios
    expect(meios).not.toContain('veiculo_oficial')
  })

  it('toggleTransporte removes termo_veiculo_proprio when deselecting veiculo_proprio', () => {
    const { toggleTransporte, setFieldValue } = useAnexo1WizardStore.getState()
    toggleTransporte('veiculo_proprio')
    setFieldValue('transporte.termo_veiculo_proprio_ciente', true)
    setFieldValue('transporte.distancia_km', '50')

    toggleTransporte('veiculo_proprio')
    const transporte = useAnexo1WizardStore.getState().formData.transporte
    expect(transporte?.termo_veiculo_proprio_ciente).toBeUndefined()
    expect(transporte?.distancia_km).toBeUndefined()
  })

  it('setAutoFlags updates autoFlags', () => {
    const { setAutoFlags } = useAnexo1WizardStore.getState()
    setAutoFlags({ foraDoPrazo: true, fds: true })
    expect(useAnexo1WizardStore.getState().autoFlags).toEqual({ foraDoPrazo: true, fds: true })
  })

  it('setAutoFlags does not update if same value', () => {
    const { setAutoFlags } = useAnexo1WizardStore.getState()
    setAutoFlags({ foraDoPrazo: false, fds: false })
    // state should not have changed — initial is same
    expect(useAnexo1WizardStore.getState().autoFlags).toEqual({ foraDoPrazo: false, fds: false })
  })

  it('setStepValidation marks a step as validated', () => {
    const { setStepValidation } = useAnexo1WizardStore.getState()
    setStepValidation(2, true)
    expect(useAnexo1WizardStore.getState().stepValidation[2]).toBe(true)
  })

  it('setChatOpen toggles chat visibility', () => {
    const { setChatOpen } = useAnexo1WizardStore.getState()
    setChatOpen(true)
    expect(useAnexo1WizardStore.getState().isChatOpen).toBe(true)
    setChatOpen(false)
    expect(useAnexo1WizardStore.getState().isChatOpen).toBe(false)
  })

  it('setChatState stores chat engine state', () => {
    const { setChatState } = useAnexo1WizardStore.getState()
    const chatState = { currentStateId: 'step1', data: {}, messages: [], isComplete: false }
    setChatState(chatState)
    expect(useAnexo1WizardStore.getState().chatState).toEqual(chatState)
  })

  it('setChatState supports updater function', () => {
    const { setChatState } = useAnexo1WizardStore.getState()
    setChatState({ currentStateId: 'init', data: {}, messages: [], isComplete: false })
    setChatState((prev) => {
      if (!prev) return prev
      return { ...prev, currentStateId: 'next_step', data: { nome: 'teste' } }
    })
    const state = useAnexo1WizardStore.getState().chatState
    expect(state?.currentStateId).toBe('next_step')
    expect(state?.data).toEqual({ nome: 'teste' })
  })

  it('resetChatState clears chat state', () => {
    const { setChatState, resetChatState } = useAnexo1WizardStore.getState()
    setChatState({ currentStateId: 'x', data: {}, messages: [], isComplete: false })
    resetChatState()
    expect(useAnexo1WizardStore.getState().chatState).toBeNull()
  })

  it('applyPayload merges data into formData', () => {
    const { applyPayload } = useAnexo1WizardStore.getState()
    applyPayload({ motivo_viagem: 'Viagem de teste' })
    expect(useAnexo1WizardStore.getState().formData.motivo_viagem).toBe('Viagem de teste')
  })

  it('reset returns to default state', () => {
    const { reset, goToStep, setFieldValue } = useAnexo1WizardStore.getState()
    goToStep(5)
    setFieldValue('motivo_viagem', 'Algo')
    setFieldValue('servidor.nome_completo', 'Nome')

    reset()

    const state = useAnexo1WizardStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.formData.motivo_viagem).toBe(defaultFormData.motivo_viagem)
    expect(state.formData.servidor?.nome_completo).toBe(defaultFormData.servidor?.nome_completo)
    expect(state.stepValidation).toEqual({})
    expect(state.isChatOpen).toBe(false)
    expect(state.chatState).toBeNull()
  })
})
