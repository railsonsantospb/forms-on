import type { ReactNode } from 'react'

interface ReviewRowProps {
  label: string
  value: ReactNode
  full?: boolean
  fullWidth?: boolean
}

export function ReviewRow({ label, value, full, fullWidth }: ReviewRowProps) {
  const isEmpty = value === undefined || value === null || value === '' || value === '—'
  const displayValue = isEmpty ? (
    <span className="text-[var(--color-subtle)]/50 italic text-sm font-normal">Não informado</span>
  ) : (
    value
  )

  return (
    <div className={full || fullWidth ? 'col-span-full' : ''}>
      <span className="block text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span className="block text-base font-semibold text-[var(--color-text)] break-words">
        {displayValue}
      </span>
    </div>
  )
}
