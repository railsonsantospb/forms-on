import { describe, it, expect, beforeEach } from 'vitest'
import { useAnexo2WizardStore, defaultFormData } from '../useAnexo2WizardStore'

beforeEach(() => {
  useAnexo2WizardStore.setState({
    currentStep: 1,
    formData: { ...defaultFormData },
    stepValidation: {},
    autoFlags: { foraDoPrazo: false },
    isChatOpen: false,
    chatState: null,
  })
})

describe('useAnexo2WizardStore', () => {
  it('initializes with step 1 and total 7', () => {
    const state = useAnexo2WizardStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.totalSteps).toBe(7)
  })

  it('goToStep clamps within valid range', () => {
    const { goToStep } = useAnexo2WizardStore.getState()
    goToStep(0)
    expect(useAnexo2WizardStore.getState().currentStep).toBe(1)
    goToStep(10)
    expect(useAnexo2WizardStore.getState().currentStep).toBe(7)
    goToStep(4)
    expect(useAnexo2WizardStore.getState().currentStep).toBe(4)
  })

  it('nextStep and prevStep work correctly', () => {
    const { nextStep } = useAnexo2WizardStore.getState()
    nextStep()
    expect(useAnexo2WizardStore.getState().currentStep).toBe(2)

    useAnexo2WizardStore.setState({ currentStep: 7 })
    nextStep()
    expect(useAnexo2WizardStore.getState().currentStep).toBe(7)

    useAnexo2WizardStore.setState({ currentStep: 3 })
    const { prevStep } = useAnexo2WizardStore.getState()
    prevStep()
    expect(useAnexo2WizardStore.getState().currentStep).toBe(2)
  })

  it('setFieldValue updates fields via dot path', () => {
    const { setFieldValue } = useAnexo2WizardStore.getState()
    setFieldValue('proposto.nome', 'Maria Teste')
    expect(useAnexo2WizardStore.getState().formData.proposto?.nome).toBe('Maria Teste')
  })

  it('addTrecho appends empty trecho', () => {
    const { addTrecho } = useAnexo2WizardStore.getState()
    addTrecho('ida')
    const ida = useAnexo2WizardStore.getState().formData.afastamento?.ida
    expect(ida).toHaveLength(2)
    expect(ida?.[1]).toEqual({ origem: '', destino: '', data_hora: '' })
  })

  it('removeTrecho does not go below 1', () => {
    const { removeTrecho } = useAnexo2WizardStore.getState()
    removeTrecho('retorno', 0)
    const retorno = useAnexo2WizardStore.getState().formData.afastamento?.retorno
    expect(retorno).toHaveLength(1)
  })

  it('updateTrecho modifies a specific trecho field', () => {
    const { updateTrecho } = useAnexo2WizardStore.getState()
    updateTrecho('ida', 0, 'origem', 'JP/PB')
    const trecho = useAnexo2WizardStore.getState().formData.afastamento?.ida?.[0]
    expect(trecho?.origem).toBe('JP/PB')
  })

  it('addAtividade appends an activity row', () => {
    const { addAtividade } = useAnexo2WizardStore.getState()
    addAtividade()
    const tabela = useAnexo2WizardStore.getState().formData.atividades_tabela
    expect(tabela).toHaveLength(2)
    expect(tabela?.[1]).toEqual({ data: '', horario: '', cidade: '', atividades: '' })
  })

  it('removeAtividade removes a specific row', () => {
    const { addAtividade, removeAtividade } = useAnexo2WizardStore.getState()
    addAtividade()
    expect(useAnexo2WizardStore.getState().formData.atividades_tabela).toHaveLength(2)
    removeAtividade(1)
    expect(useAnexo2WizardStore.getState().formData.atividades_tabela).toHaveLength(1)
  })

  it('updateAtividade updates a field in a specific row', () => {
    const { updateAtividade } = useAnexo2WizardStore.getState()
    updateAtividade(0, 'cidade', 'Recife/PE')
    const row = useAnexo2WizardStore.getState().formData.atividades_tabela?.[0]
    expect(row?.cidade).toBe('Recife/PE')
  })

  it('addAlteracao appends an alteration row', () => {
    const { addAlteracao } = useAnexo2WizardStore.getState()
    addAlteracao()
    const alteracoes = useAnexo2WizardStore.getState().formData.alteracoes_cancelamentos_noshow
    expect(alteracoes).toHaveLength(2)
  })

  it('removeAlteracao removes a specific alteration row', () => {
    const { addAlteracao, removeAlteracao } = useAnexo2WizardStore.getState()
    addAlteracao()
    expect(useAnexo2WizardStore.getState().formData.alteracoes_cancelamentos_noshow).toHaveLength(2)
    removeAlteracao(1)
    expect(useAnexo2WizardStore.getState().formData.alteracoes_cancelamentos_noshow).toHaveLength(1)
  })

  it('updateAlteracao updates a field in a specific row', () => {
    const { updateAlteracao } = useAnexo2WizardStore.getState()
    updateAlteracao(0, 'tipo', 'alteracao')
    const row = useAnexo2WizardStore.getState().formData.alteracoes_cancelamentos_noshow?.[0]
    expect(row?.tipo).toBe('alteracao')
  })

  it('setAutoFlags updates autoFlags', () => {
    const { setAutoFlags } = useAnexo2WizardStore.getState()
    setAutoFlags({ foraDoPrazo: true })
    expect(useAnexo2WizardStore.getState().autoFlags).toEqual({ foraDoPrazo: true })
  })

  it('setStepValidation marks a step', () => {
    const { setStepValidation } = useAnexo2WizardStore.getState()
    setStepValidation(3, true)
    expect(useAnexo2WizardStore.getState().stepValidation[3]).toBe(true)
  })

  it('applyPayload merges data', () => {
    const { applyPayload } = useAnexo2WizardStore.getState()
    applyPayload({ viagem_realizada: 'nao' })
    expect(useAnexo2WizardStore.getState().formData.viagem_realizada).toBe('nao')
  })

  it('reset returns to default state', () => {
    const { reset, goToStep, setFieldValue } = useAnexo2WizardStore.getState()
    goToStep(5)
    setFieldValue('proposto.nome', 'Algo')

    reset()

    const state = useAnexo2WizardStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.formData.proposto?.nome).toBe(defaultFormData.proposto?.nome)
    expect(state.stepValidation).toEqual({})
    expect(state.isChatOpen).toBe(false)
    expect(state.chatState).toBeNull()
  })
})
