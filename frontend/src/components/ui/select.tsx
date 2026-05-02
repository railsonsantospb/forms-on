import { cn } from '@/lib/cn'
import { forwardRef, type SelectHTMLAttributes } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-[var(--color-field-bg)] text-[var(--color-text)]',
          'border-[var(--color-field-border)] px-3 py-2.5 text-sm outline-none transition-colors',
          'focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20',
          'disabled:opacity-50 disabled:cursor-not-allowed appearance-none',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)
Select.displayName = 'Select'
