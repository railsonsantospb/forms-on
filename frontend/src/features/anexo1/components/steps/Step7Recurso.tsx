import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { TRANSP_LABELS } from '@/features/anexo1/lib/wizardHelpers'
import type { Anexo1Payload } from '@/types'

interface Step7RecursoProps {
  data: Partial<Anexo1Payload>
  stepErrors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
  onToggleTransporte: (meio: string) => void
}

export function Step7Recurso({ data, stepErrors, onFieldChange, onToggleTransporte }: Step7RecursoProps) {
  return (
    <div className="space-y-4">
      {/* Recurso */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <FormField label="Débito em recurso" error={stepErrors['debito_recurso.tipo']} required>
            <Select value={data.debito_recurso?.tipo || 'cchsa'} onChange={(e) => {
              const newType = e.target.value
              onFieldChange('debito_recurso.tipo', newType)
              if (!['projeto', 'outros'].includes(newType)) {
                onFieldChange('debito_recurso.detalhe', '')
              }
            }}>
              <option value="cchsa">CCHSA</option>
              <option value="cavn">CAVN</option>
              <option value="projeto">Projeto</option>
              <option value="outros">Outros</option>
            </Select>
          </FormField>
          {(data.debito_recurso?.tipo === 'projeto' || data.debito_recurso?.tipo === 'outros') && (
            <FormField label="Detalhe" error={stepErrors['debito_recurso.detalhe']} required>
              <Input value={data.debito_recurso?.detalhe || ''} onChange={(e) => onFieldChange('debito_recurso.detalhe', e.target.value)} />
            </FormField>
          )}
        </CardContent>
      </Card>

      {/* Transporte */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <FormField label="Meios de transporte" error={stepErrors['transporte.meios']} required>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(TRANSP_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)] cursor-pointer hover:bg-[var(--color-btn-hover)] transition-colors">
                  <input
                    type="checkbox"
                    checked={data.transporte?.meios?.includes(key as 'veiculo_oficial')}
                    onChange={() => onToggleTransporte(key)}
                    className="w-4 h-4 accent-[var(--color-accent)]"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </FormField>

          {data.transporte?.meios?.includes('veiculo_proprio') && (
            <div className="space-y-3 p-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.transporte?.termo_veiculo_proprio_ciente || false}
                  onChange={(e) => onFieldChange('transporte.termo_veiculo_proprio_ciente', e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-accent)]"
                />
                <span className="text-sm">Declaro estar ciente do termo de responsabilidade para uso de veículo próprio</span>
              </label>
              <FormField label="Distância (km)">
                <Input value={data.transporte?.distancia_km || ''} onChange={(e) => onFieldChange('transporte.distancia_km', e.target.value)} />
              </FormField>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
