import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { JustificativaCheckbox } from './JustificativaCheckbox'
import type { Anexo1Payload } from '@/types'

interface Step8JustificativasProps {
  data: Partial<Anexo1Payload>
  stepErrors: Record<string, string>
  autoFlags: { foraDoPrazo: boolean; fds: boolean }
  onFieldChange: (path: string, value: unknown) => void
}

export function Step8Justificativas({ data, stepErrors, autoFlags, onFieldChange }: Step8JustificativasProps) {
  const flags = data.flags || {}
  const just = data.justificativas || {}

  return (
    <div className="space-y-4">
      {/* Status e condições obrigatórias */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-2)]">
            <Badge variant={autoFlags.foraDoPrazo ? 'danger' : 'success'}>
              {autoFlags.foraDoPrazo ? 'Fora do prazo' : 'Dentro do prazo'}
            </Badge>
            <Badge variant={autoFlags.fds ? 'warning' : 'success'}>
              {autoFlags.fds ? 'Fim de Semana/Feriado' : 'Sem Fim de Semana'}
            </Badge>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={flags.envolve_fds_feriado_ou_dia_anterior || false} onChange={(e) => onFieldChange('flags.envolve_fds_feriado_ou_dia_anterior', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Envolve fim de semana, feriado ou dia anterior</span>
            </label>
            {flags.envolve_fds_feriado_ou_dia_anterior && (
              <div className="mt-2">
                <FormField label="Justificativa Fim de Semana/Feriado" error={stepErrors['justificativas.justificativa_fds_feriado_dia_anterior']} required>
                  <Textarea value={just.justificativa_fds_feriado_dia_anterior || ''} onChange={(e) => onFieldChange('justificativas.justificativa_fds_feriado_dia_anterior', e.target.value)} />
                </FormField>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer opacity-70">
              <input type="checkbox" checked={flags.fora_do_prazo || false} disabled className="w-4 h-4" />
              <span className="text-sm">Fora do prazo (calculado automaticamente)</span>
            </label>
            {flags.fora_do_prazo && (
              <div className="mt-2">
                <FormField label="Justificativa fora do prazo" error={stepErrors['justificativas.justificativa_fora_prazo']} required>
                  <Textarea value={just.justificativa_fora_prazo || ''} onChange={(e) => onFieldChange('justificativas.justificativa_fora_prazo', e.target.value)} />
                </FormField>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Justificativas adicionais */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm font-semibold mb-1">Justificativas adicionais</p>
          <p className="text-xs text-[var(--color-muted)] mb-4">
            Passagens e/ou diárias com qualquer uma das características abaixo somente serão emitidas mediante justificativa. Justifique todos os itens nos quais se enquadre a solicitação.
          </p>
          <div className="space-y-4">
            <JustificativaCheckbox
              label="Viagem urgente (menos de 20 dias de antecedência)"
              checked={!!just.just_viagem_urgente}
              value={just.just_viagem_urgente || ''}
              onToggle={() => onFieldChange('justificativas.just_viagem_urgente', just.just_viagem_urgente ? '' : ' ')}
              onChange={(v) => onFieldChange('justificativas.just_viagem_urgente', v)}
              error={stepErrors['justificativas.just_viagem_urgente']}
            />
            <JustificativaCheckbox
              label="Final de semana, feriado ou iniciada na sexta-feira"
              checked={!!just.just_fds_feriado}
              value={just.just_fds_feriado || ''}
              onToggle={() => onFieldChange('justificativas.just_fds_feriado', just.just_fds_feriado ? '' : ' ')}
              onChange={(v) => onFieldChange('justificativas.just_fds_feriado', v)}
              error={stepErrors['justificativas.just_fds_feriado']}
            />
            <JustificativaCheckbox
              label="Especificação de aeroporto"
              checked={!!just.just_aeroporto}
              value={just.just_aeroporto || ''}
              onToggle={() => onFieldChange('justificativas.just_aeroporto', just.just_aeroporto ? '' : ' ')}
              onChange={(v) => onFieldChange('justificativas.just_aeroporto', v)}
              error={stepErrors['justificativas.just_aeroporto']}
            />
            <JustificativaCheckbox
              label="Grupo de mais de 2 pessoas"
              checked={!!just.just_grupo_mais_2}
              value={just.just_grupo_mais_2 || ''}
              onToggle={() => onFieldChange('justificativas.just_grupo_mais_2', just.just_grupo_mais_2 ? '' : ' ')}
              onChange={(v) => onFieldChange('justificativas.just_grupo_mais_2', v)}
              error={stepErrors['justificativas.just_grupo_mais_2']}
            />
            <JustificativaCheckbox
              label="Grupo de mais de 5 pessoas (competência do Dirigente máximo da UFPB autorizar)"
              checked={!!just.just_grupo_mais_5}
              value={just.just_grupo_mais_5 || ''}
              onToggle={() => onFieldChange('justificativas.just_grupo_mais_5', just.just_grupo_mais_5 ? '' : ' ')}
              onChange={(v) => onFieldChange('justificativas.just_grupo_mais_5', v)}
              error={stepErrors['justificativas.just_grupo_mais_5']}
            />
            <JustificativaCheckbox
              label="Viagem com mais de 30 diárias acumuladas no exercício (competência do Dirigente máximo da UFPB autorizar)"
              checked={!!just.just_mais_30_diarias}
              value={just.just_mais_30_diarias || ''}
              onToggle={() => onFieldChange('justificativas.just_mais_30_diarias', just.just_mais_30_diarias ? '' : ' ')}
              onChange={(v) => onFieldChange('justificativas.just_mais_30_diarias', v)}
              error={stepErrors['justificativas.just_mais_30_diarias']}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
