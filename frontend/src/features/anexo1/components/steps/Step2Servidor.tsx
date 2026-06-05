import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { maskCPF, maskPhone, maskAgencia, maskConta, onlyDigits } from '@/lib/validators'
import type { Anexo1Payload } from '@/types'

interface Step2ServidorProps {
  data: Partial<Anexo1Payload>
  stepErrors: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
}

export function Step2Servidor({ data, stepErrors, onFieldChange }: Step2ServidorProps) {
  const servidor = data.servidor
  return (
    <div className="space-y-4">
      {/* Dados pessoais */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome completo" error={stepErrors['servidor.nome_completo']} required>
              <Input value={servidor?.nome_completo || ''} onChange={(e) => onFieldChange('servidor.nome_completo', e.target.value)} />
            </FormField>
            <FormField label="Cargo/Função" error={stepErrors['servidor.cargo_funcao']} required>
              <Input value={servidor?.cargo_funcao || ''} onChange={(e) => onFieldChange('servidor.cargo_funcao', e.target.value)} />
            </FormField>
            <FormField label="CPF" error={stepErrors['servidor.cpf']} required>
              <Input value={maskCPF(servidor?.cpf || '')} onChange={(e) => onFieldChange('servidor.cpf', onlyDigits(e.target.value))} placeholder="000.000.000-00" />
            </FormField>
            <FormField label="RG" error={stepErrors['servidor.rg']} required>
              <Input value={servidor?.rg || ''} onChange={(e) => onFieldChange('servidor.rg', e.target.value)} />
            </FormField>
            <FormField label="Data de nascimento" error={stepErrors['servidor.data_nascimento']} required>
              <Input type="date" value={servidor?.data_nascimento || ''} onChange={(e) => onFieldChange('servidor.data_nascimento', e.target.value)} />
            </FormField>
            <FormField label="SIAPE" error={stepErrors['servidor.siape']} required>
              <Input value={servidor?.siape || ''} onChange={(e) => onFieldChange('servidor.siape', onlyDigits(e.target.value))} placeholder="Somente números" />
            </FormField>
            <FormField label="Nome da mãe" error={stepErrors['servidor.nome_mae']} required className="sm:col-span-2">
              <Input value={servidor?.nome_mae || ''} onChange={(e) => onFieldChange('servidor.nome_mae', e.target.value)} />
            </FormField>
            <FormField label="Endereço completo" error={stepErrors['servidor.endereco']} required className="sm:col-span-2">
              <Input value={servidor?.endereco || ''} onChange={(e) => onFieldChange('servidor.endereco', e.target.value)} />
            </FormField>
            <FormField label="Telefone" error={stepErrors['servidor.telefone']} required>
              <Input value={maskPhone(servidor?.telefone || '')} onChange={(e) => onFieldChange('servidor.telefone', onlyDigits(e.target.value))} placeholder="(00) 00000-0000" />
            </FormField>
            <FormField label="E-mail" error={stepErrors['servidor.email']} required>
              <Input value={servidor?.email || ''} onChange={(e) => onFieldChange('servidor.email', e.target.value)} placeholder="email@exemplo.com" />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Dados bancários */}
      <Card>
        <CardContent className="pt-5">
          <h4 className="text-sm font-semibold mb-3">Dados bancários</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Banco" error={stepErrors['servidor.dados_bancarios.banco']} required>
              <Input value={servidor?.dados_bancarios?.banco || ''} onChange={(e) => onFieldChange('servidor.dados_bancarios.banco', e.target.value)} />
            </FormField>
            <FormField label="Agência" error={stepErrors['servidor.dados_bancarios.agencia']} required>
              <Input value={maskAgencia(servidor?.dados_bancarios?.agencia || '')} onChange={(e) => onFieldChange('servidor.dados_bancarios.agencia', onlyDigits(e.target.value))} placeholder="000000" />
            </FormField>
            <FormField label="Conta" error={stepErrors['servidor.dados_bancarios.conta']} required>
              <Input value={maskConta(servidor?.dados_bancarios?.conta || '')} onChange={(e) => onFieldChange('servidor.dados_bancarios.conta', onlyDigits(e.target.value))} placeholder="000000000-0" />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      <Card>
        <CardContent className="pt-5">
          <h4 className="text-sm font-semibold mb-3">Informações adicionais</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Tipo de vínculo" error={stepErrors['servidor.tipo_vinculo']} required>
              <Select value={servidor?.tipo_vinculo || ''} onChange={(e) => onFieldChange('servidor.tipo_vinculo', e.target.value)}>
                <option value="">Selecione...</option>
                <option value="servidor">Servidor</option>
                <option value="nao_servidor">Não Servidor</option>
                <option value="sepe">SEPE</option>
                <option value="acompanhante_pcd">Acompanhante PCD</option>
                <option value="outro">Outro</option>
              </Select>
            </FormField>
            {servidor?.tipo_vinculo === 'outro' && (
              <FormField label="Especificar vínculo" error={stepErrors['servidor.vinculo_outro_especificar']} required>
                <Input value={servidor?.vinculo_outro_especificar || ''} onChange={(e) => onFieldChange('servidor.vinculo_outro_especificar', e.target.value)} />
              </FormField>
            )}

            {servidor?.tipo_vinculo === 'sepe' && (
              <>
                <div className="sm:col-span-2">
                  <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)]">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={servidor?.auxilio_transporte?.recebe || false}
                        onChange={(e) => onFieldChange('servidor.auxilio_transporte.recebe', e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-accent)]"
                      />
                      <span className="text-sm font-medium">Recebe Auxílio Transporte</span>
                    </label>
                    {servidor?.auxilio_transporte?.recebe && (
                      <FormField label="Valor" className="mt-2">
                        <Input
                          value={servidor?.auxilio_transporte?.valor || ''}
                          onChange={(e) => onFieldChange('servidor.auxilio_transporte.valor', e.target.value)}
                          placeholder="R$ 0,00"
                        />
                      </FormField>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-btn-bg)]">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={servidor?.auxilio_alimentacao?.recebe || false}
                        onChange={(e) => onFieldChange('servidor.auxilio_alimentacao.recebe', e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-accent)]"
                      />
                      <span className="text-sm font-medium">Recebe Auxílio Alimentação</span>
                    </label>
                    {servidor?.auxilio_alimentacao?.recebe && (
                      <FormField label="Valor" className="mt-2">
                        <Input
                          value={servidor?.auxilio_alimentacao?.valor || ''}
                          onChange={(e) => onFieldChange('servidor.auxilio_alimentacao.valor', e.target.value)}
                          placeholder="R$ 0,00"
                        />
                      </FormField>
                    )}
                  </div>
                </div>
              </>
            )}

            <FormField label="Passaporte">
              <Input value={servidor?.passaporte || ''} onChange={(e) => onFieldChange('servidor.passaporte', e.target.value)} placeholder="Se for viagem internacional" />
            </FormField>
            <FormField label="Lotação/Órgão" error={stepErrors['servidor.lotacao_orgao']} required={servidor?.tipo_vinculo === 'servidor'}>
              <Input value={servidor?.lotacao_orgao || ''} onChange={(e) => onFieldChange('servidor.lotacao_orgao', e.target.value)} />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
