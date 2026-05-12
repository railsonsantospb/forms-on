/**
 * Verifica recursivamente se um objeto/array contém algum valor significativo
 * (string não-vazia, number, boolean true, ou objeto/array com valor).
 */
export function hasAnyValue(obj: unknown): boolean {
  if (obj === null || obj === undefined) return false
  if (typeof obj === 'string') return obj.trim().length > 0
  if (typeof obj === 'number') return true
  if (typeof obj === 'boolean') return obj
  if (Array.isArray(obj)) return obj.some(hasAnyValue)
  if (typeof obj === 'object') return Object.values(obj).some(hasAnyValue)
  return false
}

/**
 * Compara dois objetos ignorando campos automáticos que variam
 * (datas do dia, flags vazias, justificativas vazias).
 * Útil para saber se um rascunho salvo é equivalente ao estado inicial vazio.
 */
export function isEquivalentToDefault(
  saved: Record<string, unknown>,
  defaultData: Record<string, unknown>,
): boolean {
  const normalize = (obj: Record<string, unknown>): string => {
    const copy = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
    // Remove datas automáticas que mudam todo dia
    delete copy.data_relatorio
    delete copy.data_solicitacao
    // Remove objetos vazios
    if (copy.flags && Object.keys(copy.flags).length === 0) delete copy.flags
    if (copy.justificativas && Object.keys(copy.justificativas).length === 0) delete copy.justificativas
    // Remove arrays de objetos vazios (ex: [{tipo:'',descricao:''}])
    for (const key of Object.keys(copy)) {
      const val = copy[key]
      if (Array.isArray(val) && val.length > 0) {
        const allEmpty = val.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            Object.values(item).every((v) => v === '' || v === null || v === undefined),
        )
        if (allEmpty) delete copy[key]
      }
    }
    return JSON.stringify(copy)
  }
  return normalize(saved) === normalize(defaultData)
}
