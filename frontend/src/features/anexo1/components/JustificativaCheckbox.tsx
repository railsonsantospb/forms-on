import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'

interface JustificativaCheckboxProps {
  label: string
  checked: boolean
  value: string
  onToggle: () => void
  onChange: (value: string) => void
  error?: string
}

export function JustificativaCheckbox({
  label,
  checked,
  value,
  onToggle,
  onChange,
  error,
}: JustificativaCheckboxProps) {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4"
        />
        <span className="text-sm">{label}</span>
      </label>
      {checked && (
        <div className="mt-2">
          <FormField label="Justificativa" error={error}>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Descreva a justificativa..."
            />
          </FormField>
        </div>
      )}
    </div>
  )
}
