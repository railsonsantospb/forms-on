export function applyChatDataToForm(
  chatData: Record<string, unknown>,
  setFieldValue: (path: string, value: unknown) => void,
) {
  // Converte trechos de formato flat para arrays
  const processed = processTrechos(chatData)

  // Aplica cada campo no formulário
  for (const [key, value] of Object.entries(processed)) {
    if (key.startsWith('_chat_')) continue // campos internos do chat
    setFieldValue(key, value)
  }
}

function processTrechos(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Primeiro copia tudo que não é trecho
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('trechos.') && !key.startsWith('afastamento.')) {
      result[key] = value
    }
  }

  // Processa trechos.ida.* e trechos.retorno.*
  const trechoRegex = /^(trechos|afastamento)\.(ida|retorno)\.(\d+)\.(\w+)$/

  for (const [key, value] of Object.entries(data)) {
    const match = key.match(trechoRegex)
    if (match) {
      const [, base, type, indexStr, field] = match
      const path = `${base}.${type}`

      if (!result[path]) result[path] = {}
      const obj = result[path] as Record<string, unknown>
      if (!obj[indexStr]) obj[indexStr] = {}
      const item = obj[indexStr] as Record<string, unknown>
      item[field] = value
    }
  }

  // Converte objetos indexados para arrays
  for (const key of Object.keys(result)) {
    if (key === 'trechos' || key === 'afastamento') {
      const obj = result[key] as Record<string, Record<string, unknown>>
      const typed: Record<string, unknown> = {}
      for (const [type, items] of Object.entries(obj)) {
        const sortedKeys = Object.keys(items).sort((a, b) => Number(a) - Number(b))
        typed[type] = sortedKeys.map((k) => items[k])
      }
      result[key] = typed
    }
  }

  return result
}
