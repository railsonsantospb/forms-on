const API_BASE = '' // Proxy do Vite redireciona /api para o backend

type ErrorBody = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeErrorBody(body: unknown): ErrorBody {
  if (!isRecord(body)) return {}
  const detail = body.detail
  if (isRecord(detail)) {
    return { ...body, ...detail }
  }
  return body
}

function pickErrorMessage(status: number, body: ErrorBody): string {
  const detail = body.detail
  const message = body.message

  if (typeof detail === 'string' && detail.trim()) return detail
  if (typeof message === 'string' && message.trim()) return message

  if (isRecord(detail)) {
    if (typeof detail.detail === 'string' && detail.detail.trim()) return detail.detail
    if (typeof detail.message === 'string' && detail.message.trim()) return detail.message
  }

  if (Array.isArray(body.errors) && body.errors.length) return 'Dados inválidos.'
  if (Array.isArray(body.issues) && body.issues.length) return 'Dados inválidos.'

  return `Erro ${status}`
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const rawBody = await res.json().catch(() => ({}))
    const body = normalizeErrorBody(rawBody)
    throw new ApiError(res.status, pickErrorMessage(res.status, body), body)
  }

  return res.json() as Promise<T>
}

export async function apiBlob(
  path: string,
  options?: RequestInit,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const rawBody = await res.json().catch(() => ({}))
    const body = normalizeErrorBody(rawBody)
    throw new ApiError(res.status, pickErrorMessage(res.status, body), body)
  }

  const disposition = res.headers.get('content-disposition')
  const filename = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '') || 'documento'
  const blob = await res.blob()
  return { blob, filename }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
