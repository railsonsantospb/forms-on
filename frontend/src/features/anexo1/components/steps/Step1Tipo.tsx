import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DocumentImport } from '@/features/import/components/DocumentImport'
import { MessageCircle } from 'lucide-react'
import type { Anexo1Payload } from '@/types'

interface Step1TipoProps {
  data: Partial<Anexo1Payload>
  stepErrors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
  onImport: (file: File) => Promise<{ prefill: Record<string, unknown>; warnings?: string[] }>
  onOpenChat: () => void
}

export function Step1Tipo({ data, stepErrors, onFieldChange, onImport, onOpenChat }: Step1TipoProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onOpenChat}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all z-40"
        title="Assistente virtual"
      >
        <MessageCircle size={20} />
        <span>Dira — Assistente virtual — Preencher conversando</span>
      </button>
      <DocumentImport onImport={onImport} />
      <FormField label="Tipo de solicitação" error={stepErrors['tipo_solicitacao']} required>
        <Select value={data.tipo_solicitacao} onChange={(e) => onFieldChange('tipo_solicitacao', e.target.value)}>
          <option value="diarias">Diárias</option>
          <option value="passagens">Passagens</option>
          <option value="diarias_e_passagens">Diárias e Passagens</option>
        </Select>
      </FormField>
      <FormField label="Data da solicitação" error={stepErrors['data_solicitacao']} required>
        <Input type="date" value={data.data_solicitacao} onChange={(e) => onFieldChange('data_solicitacao', e.target.value)} />
      </FormField>
    </div>
  )
}
