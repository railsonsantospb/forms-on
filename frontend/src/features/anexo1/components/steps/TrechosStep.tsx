import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Card, CardContent } from '@/components/ui/card'
import { X, Plus } from 'lucide-react'

interface TrechosStepProps {
  type: 'ida' | 'retorno'
  trechos: { origem: string; destino: string; data_hora: string }[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: string, value: string) => void
  errors: Record<string, string>
}

export function TrechosStep({ type, trechos, onAdd, onRemove, onUpdate, errors }: TrechosStepProps) {
  const prefix = `trechos.${type}`
  return (
    <div className="space-y-4">
      {trechos.map((t, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Trecho {i + 1}</span>
              {trechos.length > 1 && (
                <button onClick={() => onRemove(i)} className="text-[var(--color-danger)] hover:opacity-80 transition-opacity">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Origem (Cidade/UF) *" error={errors[`${prefix}.${i}.origem`]}>
                <Input value={t.origem} onChange={(e) => onUpdate(i, 'origem', e.target.value)} placeholder="João Pessoa/PB" />
              </FormField>
              <FormField label="Destino (Cidade/UF) *" error={errors[`${prefix}.${i}.destino`]}>
                <Input value={t.destino} onChange={(e) => onUpdate(i, 'destino', e.target.value)} placeholder="Recife/PE" />
              </FormField>
              <div className="col-span-full">
                <FormField label="Data e hora *" error={errors[`${prefix}.${i}.data_hora`]}>
                  <Input type="datetime-local" value={t.data_hora?.slice(0, 16) || ''} onChange={(e) => onUpdate(i, 'data_hora', e.target.value ? e.target.value + ':00' : '')} />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}>
        <Plus size={14} /> Adicionar trecho de {type}
      </Button>
    </div>
  )
}
