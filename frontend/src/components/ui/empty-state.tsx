import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/30 animate-in fade-in duration-300',
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="mb-4 text-[var(--color-muted)] opacity-60" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-muted)] max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
