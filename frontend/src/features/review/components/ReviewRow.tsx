import type { ReactNode } from 'react'

interface ReviewRowProps {
  label: string
  value: ReactNode
  full?: boolean
  fullWidth?: boolean
}

export function ReviewRow({ label, value, full, fullWidth }: ReviewRowProps) {
  return (
    <div className={full || fullWidth ? 'col-span-full' : ''}>
      <span className="block text-xs font-medium text-[var(--color-subtle)] uppercase tracking-wide">
        {label}
      </span>
      <span className="block text-base font-medium text-[var(--color-text)] break-words">
        {value || '—'}
      </span>
    </div>
  )
}
