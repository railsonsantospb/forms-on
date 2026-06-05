import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import type { Anexo2Payload } from '@/types'

interface Step4AtividadesProps {
  data: Partial<Anexo2Payload>
  errors: Record<string, string>
  onAddAlteracao: () => void
  onRemoveAlteracao: (index: number) => void
  onUpdateAlteracao: (index: number, field: string, value: string) => void
  onAddAtividade: () => void
  onRemoveAtividade: (index: number) => void
  onUpdateAtividade: (index: number, field: string, value: string) => void
}

export function Step4Atividades({
  data,
  errors,
  onAddAlteracao,
  onRemoveAlteracao,
  onUpdateAlteracao,
  onAddAtividade,
  onRemoveAtividade,
  onUpdateAtividade,
}: Step4AtividadesProps) {
  return (
    <div className="space-y-4">
      <div className="border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Alterações / Cancelamentos / No Show</h4>
          <Button variant="ghost" size="sm" onClick={onAddAlteracao}>
            <Plus size={14} /> Adicionar linha
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-subtle)] text-xs uppercase">
                <th className="text-left py-2 px-2">Tipo</th>
                <th className="text-left py-2 px-2">Descrição</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(data.alteracoes_cancelamentos_noshow || []).map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50">
                  <td className="py-1 px-1">
                    <Select value={row.tipo || ''} onChange={(e) => onUpdateAlteracao(i, 'tipo', e.target.value)} className="text-xs py-1.5">
                      <option value="">Selecione</option>
                      <option value="Alteração">Alteração</option>
                      <option value="Cancelamento">Cancelamento</option>
                      <option value="No Show">No Show</option>
                      <option value="Outro">Outro</option>
                    </Select>
                  </td>
                  <td className="py-1 px-1">
                    <Input value={row.descricao || ''} onChange={(e) => onUpdateAlteracao(i, 'descricao', e.target.value)} className="text-xs py-1.5" />
                  </td>
                  <td className="py-1 px-1">
                    <button onClick={() => onRemoveAlteracao(i)} className="text-[var(--color-danger)] hover:opacity-80">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(data.alteracoes_cancelamentos_noshow || []).length === 0 && (
          <p className="text-xs text-[var(--color-danger)] mt-1">Nenhuma alteração registrada.</p>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Tabela de atividades</h4>
          <Button variant="ghost" size="sm" onClick={onAddAtividade}>
            <Plus size={14} /> Adicionar linha
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-subtle)] text-xs uppercase">
                <th className="text-left py-2 px-2">Data</th>
                <th className="text-left py-2 px-2">Horário</th>
                <th className="text-left py-2 px-2">Cidade</th>
                <th className="text-left py-2 px-2">Atividades *</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(data.atividades_tabela || []).map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50">
                  <td className="py-1 px-1">
                    <Input value={row.data || ''} onChange={(e) => onUpdateAtividade(i, 'data', e.target.value)} className="text-xs py-1.5" />
                  </td>
                  <td className="py-1 px-1">
                    <Input value={row.horario || ''} onChange={(e) => onUpdateAtividade(i, 'horario', e.target.value)} className="text-xs py-1.5" />
                  </td>
                  <td className="py-1 px-1">
                    <Input value={row.cidade || ''} onChange={(e) => onUpdateAtividade(i, 'cidade', e.target.value)} className="text-xs py-1.5" />
                  </td>
                  <td className="py-1 px-1">
                    <Input value={row.atividades || ''} onChange={(e) => onUpdateAtividade(i, 'atividades', e.target.value)} className="text-xs py-1.5" placeholder="Obrigatório" />
                  </td>
                  <td className="py-1 px-1">
                    <button onClick={() => onRemoveAtividade(i)} className="text-[var(--color-danger)] hover:opacity-80">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors['atividades_tabela'] && (
          <p className="text-xs text-[var(--color-danger)] mt-1">{errors['atividades_tabela']}</p>
        )}
      </div>
    </div>
  )
}
