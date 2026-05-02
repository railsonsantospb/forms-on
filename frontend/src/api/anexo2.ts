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
      if (!res.ok) throw new Error('Erro ao importar documento')
      return res.json() as Promise<PrefillResponse>
    },
  })
}
