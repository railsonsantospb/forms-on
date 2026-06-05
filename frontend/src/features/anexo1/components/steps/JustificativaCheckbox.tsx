import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'

interface JustificativaCheckboxProps {
  label: string
  checked: boolean
  value: string
  onToggle: () => void
  onChange: (v: string) => void
  error?: string
}

export function JustificativaCheckbox({ label, checked, value, onToggle, onChange, error }: JustificativaCheckboxProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 mt-0.5 accent-[var(--color-accent)]"
        />
        <span className="text-sm">{label}</span>
      </label>
      {checked && (
        <div className="ml-6">
          <FormField label="Justificativa" error={error}>
            <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="Informe a justificativa..." />
          </FormField>
        </div>
      )}
    </div>
  )
}
