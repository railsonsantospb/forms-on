import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import type { Anexo2Payload } from '@/types'

interface Step5PrazoProps {
  data: Partial<Anexo2Payload>
  errors: Record<string, string>
  autoFlags: { foraDoPrazo: boolean }
  onFieldChange: (path: string, value: unknown) => void
}

export function Step5Prazo({ data, errors, autoFlags, onFieldChange }: Step5PrazoProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-2)]">
        <Badge variant={autoFlags.foraDoPrazo ? 'danger' : 'success'}>
          {autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'}
        </Badge>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer opacity-70">
          <input type="checkbox" checked={data.flags?.prestacao_contas_fora_prazo || false} disabled className="w-4 h-4" />
          <span className="text-sm">Prestação de contas fora do prazo (calculado automaticamente)</span>
        </label>
        {data.flags?.prestacao_contas_fora_prazo && (
          <div className="mt-2">
            <FormField label="Justificativa" error={errors['justificativa_prestacao_contas_fora_prazo']} required>
              <Textarea
                value={data.justificativa_prestacao_contas_fora_prazo || ''}
                onChange={(e) => onFieldChange('justificativa_prestacao_contas_fora_prazo', e.target.value)}
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  )
}
