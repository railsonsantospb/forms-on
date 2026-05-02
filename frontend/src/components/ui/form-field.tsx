import { cn } from '@/lib/cn'
import { Label } from './label'
import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
  required?: boolean
  className?: string
}

export function FormField({ label, error, children, required, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label>
        {label}
        {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-[11px] text-[var(--color-danger)] font-medium">{error}</p>
      )}
    </div>
  )
}
