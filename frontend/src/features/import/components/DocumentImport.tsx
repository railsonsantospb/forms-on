import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface DocumentImportProps {
  onImport: (file: File) => Promise<{ prefill: Record<string, unknown>; warnings?: string[] }>
  label?: string
}

export function DocumentImport({ onImport, label = 'Importar dados de documento preenchido' }: DocumentImportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])

  const handleFile = async (file: File) => {
    if (!file) return
    setIsLoading(true)
    setWarnings([])
    try {
      const result = await onImport(file)
      if (result.warnings?.length) {
        setWarnings(result.warnings)
      }
      toast.success('Documento importado com sucesso!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar documento')
    } finally {
      setIsLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-[var(--color-accent)]/10">
            <FileText size={18} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">{label}</h4>
            <p className="text-[11px] text-[var(--color-muted)]">
              Envie um PDF, DOCX ou DOC preenchido para importar os dados automaticamente.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          isLoading={isLoading}
        >
          <Upload size={14} /> Selecionar arquivo
        </Button>

        {warnings.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--color-warning)]/8 border border-[var(--color-warning)]/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={12} className="text-[var(--color-warning)]" />
              <span className="text-xs font-medium text-[var(--color-warning)]">Atenção na importação</span>
            </div>
            <ul className="space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i} className="text-[11px] text-[var(--color-muted)]">• {w}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
