import { cn } from '@/lib/cn'
import { Label } from './label'
import type { ReactNode } from 'react'
import { useMemo, createContext, useContext } from 'react'

interface FormFieldContextType {
  fieldId: string
  errorId: string
  error?: string
  required?: boolean
}

const FormFieldContext = createContext<FormFieldContextType | undefined>(undefined)

export function useFormFieldContext() {
  const context = useContext(FormFieldContext)
  if (!context) {
    return { fieldId: '', errorId: '', error: undefined, required: false }
  }
  return context
}

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
  const fieldId = useMemo(() => htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`, [htmlFor])
  const errorId = `${fieldId}-error`

  const contextValue: FormFieldContextType = {
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
