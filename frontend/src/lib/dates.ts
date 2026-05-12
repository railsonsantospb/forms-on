import { parse, format, isWeekend as dfIsWeekend, differenceInCalendarDays } from 'date-fns'

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return ''
  const d = parse(isoDate, 'yyyy-MM-dd', new Date())
  return format(d, 'dd/MM/yyyy')
}

export function formatDateTimeBR(isoDT: string): string {
  if (!isoDT) return ''
  const d = parse(isoDT.slice(0, 16), "yyyy-MM-dd'T'HH:mm", new Date())
  return format(d, 'dd/MM/yyyy HH:mm')
}

export function parseDateBRToISO(brDate: string): string | null {
  const match = brDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (date.getDate() !== Number(d) || date.getMonth() !== Number(m) - 1) return null
  return format(date, 'yyyy-MM-dd')
}

export function parseISOToDate(iso: string): Date {
  return parse(iso.slice(0, 16), "yyyy-MM-dd'T'HH:mm", new Date())
}

export function normalizeDT(s: string): string {
  // Garante :00 no final de datetime-local (16 -> 19 chars)
  if (!s) return s
  if (s.length === 16) return s + ':00'
  return s
}

export function isWeekend(dateStr: string): boolean {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date())
  return dfIsWeekend(d)
}

export function daysDiff(dateA: string, dateB: string): number {
  const a = parse(dateA, 'yyyy-MM-dd', new Date())
  const b = parse(dateB, 'yyyy-MM-dd', new Date())
  return differenceInCalendarDays(b, a)
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDateChat(isoDate: string): string {
  if (!isoDate) return ''
  return `Data: ${formatDateBR(isoDate)}`
}

export function formatDateTimeChat(isoDT: string): string {
  if (!isoDT) return ''
  const d = parse(isoDT.slice(0, 16), "yyyy-MM-dd'T'HH:mm", new Date())
  const dateStr = format(d, 'dd/MM/yyyy')
  const hour = d.getHours()
  const minute = d.getMinutes()
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  let period: string
  if (hour >= 5 && hour < 12) period = ' da manhã'
  else if (hour >= 12 && hour < 18) period = ' da tarde'
  else if (hour >= 18 && hour < 24) period = ' da noite'
  else period = ' da madrugada'
  return `Data: ${dateStr}, Horas: ${timeStr}${period}`
}
