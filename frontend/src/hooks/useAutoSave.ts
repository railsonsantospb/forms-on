import { useEffect, useCallback } from 'react'
import { encryptData, decryptData } from '@/lib/crypto'

export function useAutoSave<T>(key: string, data: T, delay = 2000) {
  // Salva somente na sessão atual para evitar persistência de PII no disco.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const json = JSON.stringify(data)
        const encrypted = await encryptData(json)
        sessionStorage.setItem(key, encrypted)
      } catch {
        // Fallback: não salva se criptografia falhar
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [key, data, delay])

  // Restaura
  const restore = useCallback(async (): Promise<T | null> => {
    const saved = sessionStorage.getItem(key)
    if (!saved) return null
    try {
      const decrypted = await decryptData(saved)
      if (!decrypted) return null
      return JSON.parse(decrypted) as T
    } catch {
      sessionStorage.removeItem(key)
      return null
    }
  }, [key])

  // Limpa
  const clear = useCallback(() => {
    sessionStorage.removeItem(key)
  }, [key])

  return { restore, clear }
}
