import { Anexo2Wizard } from '@/features/anexo2/components/Anexo2Wizard'

export function Anexo2Page() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Anexo II</h1>
          <p className="text-sm text-[var(--color-muted)]">Relatório de Viagem</p>
        </div>
      </div>
      <Anexo2Wizard />
    </div>
  )
}
