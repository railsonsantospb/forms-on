import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'

interface ReviewSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  onEdit?: () => void
}

export function ReviewSection({ title, icon, children, className, onEdit }: ReviewSectionProps) {
  return (
    <div className={cn('bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 mb-4 shadow-sm backdrop-blur-md transition-all hover:border-[var(--color-accent)]/30', className)}>
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[var(--color-border)]">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
          {icon && <span className="text-sm text-[var(--color-accent-2)]">{icon}</span>}
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-subtle)] hover:text-[var(--color-accent)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--color-btn-hover)]"
            title={`Editar ${title}`}
          >
            <Pencil size={12} />
            <span>Editar</span>
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
