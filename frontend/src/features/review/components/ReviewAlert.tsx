import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'
import { AlertTriangle, AlertOctagon } from 'lucide-react'

interface ReviewAlertProps {
  children: ReactNode
  variant?: 'warning' | 'danger'
  className?: string
}

export function ReviewAlert({ children, variant = 'warning', className }: ReviewAlertProps) {
  const variants = {
    warning: 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 text-[var(--color-warning)]',
    danger: 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-[var(--color-danger)]',
  }

  const Icon = variant === 'danger' ? AlertOctagon : AlertTriangle

  return (
    <div className={cn('mt-3 px-4 py-3.5 rounded-[var(--radius-md)] border text-sm leading-relaxed flex items-start gap-3 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200', variants[variant], className)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 font-medium">{children}</div>
    </div>
  )
}
