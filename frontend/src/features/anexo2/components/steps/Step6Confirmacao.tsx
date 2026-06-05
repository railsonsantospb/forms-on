import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import { ReviewAlert } from '@/features/review/components/ReviewAlert'
import type { Anexo2Payload } from '@/types'

interface Step6ConfirmacaoProps {
  data: Partial<Anexo2Payload>
  errors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
}

export function Step6Confirmacao({ data, errors, onFieldChange }: Step6ConfirmacaoProps) {
  return (
    <div className="space-y-4">
      <FormField label="A viagem foi realizada?" error={errors['viagem_realizada']} required>
        <Select value={data.viagem_realizada || 'sim'} onChange={(e) => onFieldChange('viagem_realizada', e.target.value)}>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </Select>
      </FormField>
      {data.viagem_realizada === 'nao' && (
        <ReviewAlert variant="danger">
          <strong>Atenção:</strong> A viagem não foi realizada. No campo "Atividades desenvolvidas" (passo anterior), descreva o motivo da não realização.
        </ReviewAlert>
      )}
    </div>
  )
}
