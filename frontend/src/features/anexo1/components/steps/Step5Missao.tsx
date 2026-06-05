import { Info } from 'lucide-react'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { Anexo1Payload } from '@/types'

interface Step5MissaoProps {
  data: Partial<Anexo1Payload>
  stepErrors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
}

export function Step5Missao({ data, stepErrors, onFieldChange }: Step5MissaoProps) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/20">
          <Info size={15} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            As datas da missão definem o período de cálculo das diárias. Devem abranger o deslocamento completo, do início ao término da atividade oficial.
          </p>
        </div>
        <FormField label="Início da missão" error={stepErrors['missao.inicio_data_hora']} required>
          <Input type="datetime-local" value={data.missao?.inicio_data_hora?.slice(0, 16) || ''} onChange={(e) => onFieldChange('missao.inicio_data_hora', e.target.value ? e.target.value + ':00' : '')} />
        </FormField>
        <FormField label="Término da missão" error={stepErrors['missao.termino_data_hora']} required>
          <Input type="datetime-local" value={data.missao?.termino_data_hora?.slice(0, 16) || ''} onChange={(e) => onFieldChange('missao.termino_data_hora', e.target.value ? e.target.value + ':00' : '')} />
        </FormField>
      </CardContent>
    </Card>
  )
}
