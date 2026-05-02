import { Anexo1Wizard } from '@/features/anexo1/components/Anexo1Wizard'

export function Anexo1Page() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Anexo I</h1>
          <p className="text-sm text-[var(--color-muted)]">Requisição de Diárias/Passagens</p>
        </div>
      </div>
      <Anexo1Wizard />
    </div>
  )
}
