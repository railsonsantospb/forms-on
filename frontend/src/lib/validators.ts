const CPF_BLACKLIST = [
  '00000000000', '11111111111', '22222222222', '33333333333',
  '44444444444', '55555555555', '66666666666', '77777777777',
  '88888888888', '99999999999',
]

export function isCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11 || CPF_BLACKLIST.includes(clean)) return false

  let sum = 0
  let remainder: number

  for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(10, 11))) return false

  return true
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function isPhoneDigits(s: string): boolean {
  return /^\d{10,11}$/.test(s.replace(/\D/g, ''))
}

export function isSiape(s: string): boolean {
  return /^\d{4,15}$/.test(s)
}

export function isRG(s: string): boolean {
  return s.length >= 3 && s.length <= 20
}

export function isMinMax(s: string, min: number, max: number): boolean {
  const len = s.trim().length
  return len >= min && len <= max
}

export function isNumLen(s: string, min: number, max: number): boolean {
  return /^\d+$/.test(s) && s.length >= min && s.length <= max
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function maskCPF(value: string): string {
  const v = onlyDigits(value).slice(0, 11)
  if (v.length <= 3) return v
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
}

export function maskPhone(value: string): string {
  const v = onlyDigits(value).slice(0, 11)
  if (v.length <= 2) return v
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

export function maskAgencia(value: string): string {
  return onlyDigits(value).slice(0, 6)
}

export function maskConta(value: string): string {
  const digits = onlyDigits(value).slice(0, 12)
  if (digits.length > 1) {
    return digits.slice(0, -1) + '-' + digits.slice(-1)
  }
  return digits
}
