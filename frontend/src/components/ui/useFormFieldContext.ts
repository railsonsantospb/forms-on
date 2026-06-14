import { createContext, useContext } from 'react'

interface FormFieldContextType {
  fieldId: string
  errorId: string
  error?: string
  required?: boolean
}

export const FormFieldContext = createContext<FormFieldContextType | undefined>(undefined)

export function useFormFieldContext() {
  const context = useContext(FormFieldContext)
  if (!context) {
    return { fieldId: '', errorId: '', error: undefined, required: false }
  }
  return context
}
