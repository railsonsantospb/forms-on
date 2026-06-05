import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import type { Anexo1Payload } from '@/types'

interface Step6MotivoProps {
  data: Partial<Anexo1Payload>
  stepErrors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
}

export function Step6Motivo({ data, stepErrors, onFieldChange }: Step6MotivoProps) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <FormField label="Motivo da viagem" error={stepErrors['motivo_viagem']} required>
          <Textarea value={data.motivo_viagem || ''} onChange={(e) => onFieldChange('motivo_viagem', e.target.value)} rows={5} placeholder="Descreva o objetivo da viagem e as atividades a serem realizadas..." />
        </FormField>
        <FormField label="Relação de pertinência" error={stepErrors['relacao_pertinencia']} required>
          <Textarea value={data.relacao_pertinencia || ''} onChange={(e) => onFieldChange('relacao_pertinencia', e.target.value)} rows={3} placeholder="Explique a relação da viagem com as atividades institucionais..." />
        </FormField>
      </CardContent>
    </Card>
  )
}
