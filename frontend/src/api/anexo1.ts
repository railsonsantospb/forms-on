import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch, apiBlob } from './client'
import type { Anexo1Payload, PreviewResponse, PrefillResponse, ServerDateResponse } from '@/types'

export function useServerDate() {
  return useQuery({
    queryKey: ['server-date'],
    queryFn: () => apiFetch<ServerDateResponse>('/api/server-date'),
  })
}

export function useAnexo1Preview() {
  return useMutation({
    mutationFn: (payload: Anexo1Payload) =>
      apiFetch<PreviewResponse>('/api/anexo1/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}

export function useAnexo1Generate() {
  return useMutation({
    mutationFn: async ({ format, payload }: { format: 'docx' | 'pdf'; payload: Anexo1Payload }) => {
      const { blob, filename } = await apiBlob(`/api/anexo1/generate?format=${format}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return { blob, filename }
    },
  })
}

export function useAnexo1Prefill() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/anexo1/prefill-from-anexo1', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Erro ao importar documento')
      return res.json() as Promise<PrefillResponse>
    },
  })
}
