import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface ReviewAlertProps {
  children: ReactNode
  variant?: 'warning' | 'danger'
  className?: string
}

export function ReviewAlert({ children, variant = 'warning', className }: ReviewAlertProps) {
  const variants = {
    warning: 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 text-[var(--color-warning)]',
    danger: 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 text-[var(--color-danger)]',
  }

  return (
    <div className={cn('mt-1.5 px-2 py-1.5 rounded-md border text-xs leading-relaxed', variants[variant], className)}>
      {children}
    </div>
  )
}
