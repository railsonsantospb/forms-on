import { cn } from '@/lib/cn'
import { Label } from './label'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { FormFieldContext } from './useFormFieldContext'

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
  required?: boolean
  className?: string
  htmlFor?: string
}

export function FormField({ label, error, children, required, className, htmlFor }: FormFieldProps) {
  // Generate unique ID if not provided
  const baseId = useId()
  const fieldId = htmlFor || `field-${baseId}`
  const errorId = `${fieldId}-error`

  const contextValue = {
    fieldId,
    errorId,
    error,
    required,
  }

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div className={cn('space-y-1', className)}>
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-[var(--color-danger)] ml-0.5" aria-label="obrigatório">*</span>}
        </Label>
        {children}
        {error && (
          <p
            id={errorId}
            className="text-[11px] text-[var(--color-danger)] font-medium"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  )
}
