import { cn } from '@/lib/cn'
import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-[var(--color-field-bg)] text-[var(--color-text)] placeholder:text-[var(--color-field-placeholder)]',
          'border-[var(--color-field-border)] px-3 py-2.5 text-sm outline-none transition-colors',
          'focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        onInvalid={(e) => e.preventDefault()}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
