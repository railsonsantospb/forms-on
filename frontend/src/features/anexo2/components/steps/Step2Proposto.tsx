import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { maskCPF, maskPhone, onlyDigits } from '@/lib/validators'
import type { Anexo2Payload } from '@/types'

interface Step2PropostoProps {
  data: Partial<Anexo2Payload>
  errors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
}

export function Step2Proposto({ data, errors, onFieldChange }: Step2PropostoProps) {
  const proposto = data.proposto

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Nome completo" error={errors['proposto.nome']} required>
          <Input value={proposto?.nome || ''} onChange={(e) => onFieldChange('proposto.nome', e.target.value)} />
        </FormField>
        <FormField label="CPF" error={errors['proposto.cpf']} required>
          <Input value={maskCPF(proposto?.cpf || '')} onChange={(e) => onFieldChange('proposto.cpf', onlyDigits(e.target.value))} placeholder="000.000.000-00" />
        </FormField>
        <FormField label="SIAPE" error={errors['proposto.siape']} required>
          <Input value={proposto?.siape || ''} onChange={(e) => onFieldChange('proposto.siape', onlyDigits(e.target.value))} placeholder="Somente números" />
        </FormField>
        <FormField label="Cargo/Função" error={errors['proposto.cargo_funcao']} required>
          <Input value={proposto?.cargo_funcao || ''} onChange={(e) => onFieldChange('proposto.cargo_funcao', e.target.value)} />
        </FormField>
        <FormField label="Telefone" error={errors['proposto.telefone']} required>
          <Input value={maskPhone(proposto?.telefone || '')} onChange={(e) => onFieldChange('proposto.telefone', onlyDigits(e.target.value))} placeholder="(00) 00000-0000" />
        </FormField>
        <FormField label="E-mail" error={errors['proposto.email']} required>
          <Input value={proposto?.email || ''} onChange={(e) => onFieldChange('proposto.email', e.target.value)} placeholder="email@exemplo.com" />
        </FormField>
      </div>
      <div className="border-t border-[var(--color-border)] pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Órgão de exercício" error={errors['proposto.orgao.tipo']} required>
            <Select value={proposto?.orgao?.tipo || 'cchsa'} onChange={(e) => onFieldChange('proposto.orgao.tipo', e.target.value)}>
              <option value="cchsa">CCHSA</option>
              <option value="cavn">CAVN</option>
              <option value="projetos">Projetos</option>
              <option value="outros">Outros</option>
            </Select>
          </FormField>
          {(proposto?.orgao?.tipo === 'projetos' || proposto?.orgao?.tipo === 'outros') && (
            <FormField label="Detalhe" error={errors['proposto.orgao.detalhe']} required>
              <Input value={proposto?.orgao?.detalhe || ''} onChange={(e) => onFieldChange('proposto.orgao.detalhe', e.target.value)} />
            </FormField>
          )}
        </div>
      </div>
    </div>
  )
}
