import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface ReviewSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function ReviewSection({ title, icon, children, className }: ReviewSectionProps) {
  return (
    <div className={cn('bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 mb-2', className)}>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-3 pb-2 border-b border-[var(--color-border)]">
        {icon && <span className="text-sm">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  )
}
