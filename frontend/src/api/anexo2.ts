import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch, apiBlob } from './client'
import type { Anexo2Payload, PreviewResponse, PrefillResponse, ServerDateResponse } from '@/types'

export function useServerDate() {
  return useQuery({
    queryKey: ['server-date'],
    queryFn: () => apiFetch<ServerDateResponse>('/api/server-date'),
  })
}

export function useAnexo2Preview() {
  return useMutation({
    mutationFn: (payload: Anexo2Payload) =>
      apiFetch<PreviewResponse>('/api/anexo2/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}

export function useAnexo2Generate() {
  return useMutation({
    mutationFn: async ({ format, payload }: { format: 'docx' | 'pdf'; payload: Anexo2Payload }) => {
      const { blob, filename } = await apiBlob(`/api/anexo2/generate?format=${format}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return { blob, filename }
    },
  })
}

export function useAnexo2Prefill() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/anexo2/prefill-from-anexo1', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>))
        const detail = (body as Record<string, unknown>).detail
        const message = (body as Record<string, unknown>).message

        let msg = 'Erro ao importar documento'
        if (typeof detail === 'string' && detail.trim()) msg = detail
        else if (typeof message === 'string' && message.trim()) msg = message
        else if (detail && typeof detail === 'object' && 'detail' in detail && typeof (detail as { detail?: unknown }).detail === 'string') {
          msg = (detail as { detail: string }).detail
        }

        throw new Error(msg)
      }

      return res.json() as Promise<PrefillResponse>
    },
  })
}
