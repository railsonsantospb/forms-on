import { cn } from '@/lib/cn'
import type { LabelHTMLAttributes } from 'react'

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide mb-1.5',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
}
