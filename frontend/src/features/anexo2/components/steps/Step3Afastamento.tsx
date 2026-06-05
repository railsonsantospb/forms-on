import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import type { Anexo2Payload } from '@/types'

interface Step3AfastamentoProps {
  data: Partial<Anexo2Payload>
  errors: Record<string, string>
  onAddTrecho: (type: 'ida' | 'retorno') => void
  onRemoveTrecho: (type: 'ida' | 'retorno', index: number) => void
  onUpdateTrecho: (type: 'ida' | 'retorno', index: number, field: string, value: string) => void
}

export function Step3Afastamento({ data, errors, onAddTrecho, onRemoveTrecho, onUpdateTrecho }: Step3AfastamentoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold mb-3">Trechos de ida</h4>
        <TrechosList
          trechos={data.afastamento?.ida || []}
          onAdd={() => onAddTrecho('ida')}
          onRemove={(i) => onRemoveTrecho('ida', i)}
          onUpdate={(i, f, v) => onUpdateTrecho('ida', i, f, v)}
          errors={errors}
          prefix="afastamento.ida"
        />
      </div>
      <div className="border-t border-[var(--color-border)] pt-4">
        <h4 className="text-sm font-semibold mb-3">Trechos de retorno</h4>
        <TrechosList
          trechos={data.afastamento?.retorno || []}
          onAdd={() => onAddTrecho('retorno')}
          onRemove={(i) => onRemoveTrecho('retorno', i)}
          onUpdate={(i, f, v) => onUpdateTrecho('retorno', i, f, v)}
          errors={errors}
          prefix="afastamento.retorno"
        />
      </div>
    </div>
  )
}

function TrechosList({ trechos, onAdd, onRemove, onUpdate, errors, prefix }: {
  trechos: { origem: string; destino: string; data_hora: string }[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: string, value: string) => void
  errors: Record<string, string>
  prefix: string
}) {
  return (
    <div className="space-y-3">
      {trechos.map((t, i) => (
        <Card key={i}>
          <CardContent className="pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Trecho {i + 1}</span>
              {trechos.length > 1 && (
                <button onClick={() => onRemove(i)} className="text-[var(--color-danger)] hover:opacity-80"><X size={14} /></button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField label="Origem (Cidade/UF) *" error={errors[`${prefix}.${i}.origem`]}>
                <Input value={t.origem} onChange={(e) => onUpdate(i, 'origem', e.target.value)} placeholder="João Pessoa/PB" />
              </FormField>
              <FormField label="Destino (Cidade/UF) *" error={errors[`${prefix}.${i}.destino`]}>
                <Input value={t.destino} onChange={(e) => onUpdate(i, 'destino', e.target.value)} placeholder="Recife/PE" />
              </FormField>
              <div className="col-span-full">
                <FormField label="Data e hora" error={errors[`${prefix}.${i}.data_hora`]}>
                  <Input type="datetime-local" value={t.data_hora?.slice(0, 16) || ''} onChange={(e) => onUpdate(i, 'data_hora', e.target.value ? e.target.value + ':00' : '')} />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}><Plus size={14} /> Adicionar trecho</Button>
    </div>
  )
}
