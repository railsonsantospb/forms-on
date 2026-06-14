/**
 * Utilitários de criptografia para proteger dados sensíveis no sessionStorage.
 * Usa AES-GCM via Web Crypto API quando disponível (HTTPS/localhost).
 * Em contextos HTTP sem crypto.subtle, armazena em texto plano como fallback.
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

function isSecureContext(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem('__ufpb_key__')

  if (stored) {
    const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    return crypto.subtle.importKey(
      'raw',
      keyData,
      { name: ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    )
  }

  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )

  const exported = await crypto.subtle.exportKey('raw', key)
  const exportedArray = new Uint8Array(exported)
  sessionStorage.setItem('__ufpb_key__', btoa(String.fromCharCode(...exportedArray)))

  return key
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return btoa(String.fromCharCode(...bytes))
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return bytes.buffer
}

const PLAIN_PREFIX = '__plain__:'

export async function encryptData(data: string): Promise<string> {
  if (!isSecureContext()) {
    return PLAIN_PREFIX + btoa(data)
  }

  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(data)

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return arrayBufferToBase64(combined)
}

export async function decryptData(encryptedData: string): Promise<string | null> {
  try {
    if (encryptedData.startsWith(PLAIN_PREFIX)) {
      return atob(encryptedData.slice(PLAIN_PREFIX.length))
    }

    if (!isSecureContext()) return null

    const key = await getOrCreateKey()
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedData))

    const iv = combined.slice(0, IV_LENGTH)
    const encrypted = combined.slice(IV_LENGTH)

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}
