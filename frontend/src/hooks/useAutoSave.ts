import { useEffect, useCallback } from 'react'

export function useAutoSave<T>(key: string, data: T, delay = 2000) {
  // Salva automaticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(data))
    }, delay)
    return () => clearTimeout(timer)
  }, [key, data, delay])

  // Restaura
  const restore = useCallback((): T | null => {
    const saved = localStorage.getItem(key)
    if (!saved) return null
    try {
      return JSON.parse(saved) as T
    } catch {
      return null
    }
  }, [key])

  // Limpa
  const clear = useCallback(() => {
    localStorage.removeItem(key)
  }, [key])

  return { restore, clear }
}
