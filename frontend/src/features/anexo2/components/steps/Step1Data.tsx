import { MessageCircle } from 'lucide-react'
import { DocumentImport } from '@/features/import/components/DocumentImport'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import type { Anexo2Payload } from '@/types'

interface Step1DataProps {
  data: Partial<Anexo2Payload>
  errors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
  onImport: (file: File) => Promise<{ prefill: Record<string, unknown>; warnings?: string[] }>
  onOpenChat: () => void
}

export function Step1Data({ data, errors, onFieldChange, onImport, onOpenChat }: Step1DataProps) {
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
      <DocumentImport onImport={onImport} label="Importar de Anexo I preenchido" />
      <FormField label="Data do relatório" error={errors['data_relatorio']} required>
        <Input type="date" value={data.data_relatorio} onChange={(e) => onFieldChange('data_relatorio', e.target.value)} />
      </FormField>
    </div>
  )
}
