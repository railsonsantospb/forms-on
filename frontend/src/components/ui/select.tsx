import { cn } from '@/lib/cn'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { useFormFieldContext } from './useFormFieldContext'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const { fieldId, errorId, error } = useFormFieldContext()

    // Determine success state: has value and no error
    const hasValue = props.value !== undefined && props.value !== '' && props.value !== null
    const showSuccess = !error && hasValue

    // Combine aria-describedby: error first, then any provided ones
    const combinedAriaDescribedBy = [error ? errorId : '', ariaDescribedBy]
      .filter(Boolean)
      .join(' ')

    return (
      <select
        ref={ref}
        id={fieldId || props.id}
        className={cn(
          'w-full rounded-xl border bg-[var(--color-field-bg)] text-[var(--color-text)]',
          'border-[var(--color-field-border)] px-3 py-2.5 text-sm outline-none transition-all',
          'focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/30',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/20',
          'disabled:opacity-50 disabled:cursor-not-allowed appearance-none',
          error && 'border-[var(--color-danger)]/50 focus:border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/20',
          showSuccess && 'border-[var(--color-success)]/50 focus:border-[var(--color-success)]/50 focus:ring-[var(--color-success)]/20',
          className,
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={combinedAriaDescribedBy || undefined}
        {...props}
      >
        {children}
      </select>
    )
  },
)
Select.displayName = 'Select'
