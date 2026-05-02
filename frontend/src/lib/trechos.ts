import type { Trecho } from '@/types'

export function validateTrechoBounds(
  ida: Trecho[],
  retorno: Trecho[],
): { ok: boolean; error?: string } {
  if (!ida.length || !retorno.length) {
    return { ok: false, error: 'Preencha pelo menos um trecho de ida e um de retorno.' }
  }

  const firstIda = new Date(ida[0].data_hora)
  const lastRetorno = new Date(retorno[retorno.length - 1].data_hora)

  if (lastRetorno < firstIda) {
    return { ok: false, error: 'A data de retorno não pode ser anterior à data de ida.' }
  }

  return { ok: true }
}

export function getBoundaryDates(ida: Trecho[], retorno: Trecho[]): { ida: Date; retorno: Date } {
  return {
    ida: new Date(ida[0]?.data_hora || ''),
    retorno: new Date(retorno[retorno.length - 1]?.data_hora || ''),
  }
}
