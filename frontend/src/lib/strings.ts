export function splitLocal(value: string): { cidade: string; uf: string } {
  const parts = value.split('/')
  return {
    cidade: parts[0]?.trim() || '',
    uf: parts[1]?.trim() || '',
  }
}

export function composeLocal(cidade: string, uf: string): string {
  return `${cidade.trim()}/${uf.trim().toUpperCase()}`
}

export function setDeep(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
      current[k] = {}
    }
    current = current[k] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}

export function getDeep<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  const keys = path.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[k]
  }
  return current as T
}

export function escHtml(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
