import { cn } from '@/lib/cn'
import { forwardRef, type TextareaHTMLAttributes } from 'react'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-[var(--color-field-bg)] text-[var(--color-text)] placeholder:text-[var(--color-field-placeholder)]',
          'border-[var(--color-field-border)] px-3 py-2.5 text-sm outline-none transition-colors resize-y min-h-[80px]',
          'focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'
