import { test, expect } from '@playwright/test'

test.describe('Validações de Regras de Negócio e Exceções', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()))
  })

  
  test('Deve exibir erro ao preencher CPF inválido', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/anexo1"]')
    await page.waitForURL('**/anexo1')

    // === PASSO 1: TIPO ===
    await page.getByLabel('Tipo de solicitação').selectOption('diarias')
    await page.getByLabel('Data da solicitação').fill('2026-05-30')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 2
    await expect(page.locator('h2:has-text("Passo 1")')).toBeHidden()

    // === PASSO 2: SERVIDOR ===
    await page.getByLabel('Nome completo').fill('João Silva')
    await page.getByLabel('Cargo/Função').fill('Professor')
    
    // Insere CPF inválido
    await page.getByLabel('CPF').fill('111.111.111-11')
    await page.getByLabel(/^RG(\s*\*|)$/).fill('1234567')
    await page.getByLabel('Data de nascimento').fill('1980-05-15')
    await page.getByLabel('SIAPE').fill('1234567')
    await page.getByLabel('Nome da mãe').fill('Maria Silva')
    await page.getByLabel('Endereço completo').fill('Rua ABC, 123')
    await page.getByLabel('Telefone').fill('83999999999')
    await page.getByLabel('E-mail').fill('joao@example.com')
    await page.getByLabel('Banco').fill('Banco do Brasil')
    await page.getByLabel('Agência').fill('1234')
    await page.getByLabel('Conta').fill('56789')
    await page.getByLabel('Tipo de vínculo').selectOption('servidor')
    await page.getByLabel('Lotação/Órgão').fill('CCHSA')

    // Tenta avançar
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Deve mostrar o aviso de erro de CPF inválido no campo
    await expect(page.locator('p[role="alert"]:has-text("CPF inválido")')).toBeVisible()
  })

  test('Deve exigir justificativa se a solicitação estiver fora do prazo', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/anexo1"]')
    await page.waitForURL('**/anexo1')

    // === PASSO 1: TIPO ===
    await page.getByLabel('Tipo de solicitação').selectOption('diarias')
    // Data da solicitação muito próxima da viagem (2 dias de antecedência, fora do prazo de 10 dias)
    await page.getByLabel('Data da solicitação').fill('2026-06-08')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 2
    await expect(page.locator('h2:has-text("Passo 1")')).toBeHidden()

    // === PASSO 2: SERVIDOR ===
    await page.getByLabel('Nome completo').fill('João Silva')
    await page.getByLabel('Cargo/Função').fill('Professor')
    await page.getByLabel('CPF').fill('529.982.247-25')
    await page.getByLabel(/^RG(\s*\*|)$/).fill('1234567')
    await page.getByLabel('Data de nascimento').fill('1980-05-15')
    await page.getByLabel('SIAPE').fill('1234567')
    await page.getByLabel('Nome da mãe').fill('Maria Silva')
    await page.getByLabel('Endereço completo').fill('Rua ABC, 123')
    await page.getByLabel('Telefone').fill('83999999999')
    await page.getByLabel('E-mail').fill('joao@example.com')
    await page.getByLabel('Banco').fill('Banco do Brasil')
    await page.getByLabel('Agência').fill('1234')
    await page.getByLabel('Conta').fill('56789')
    await page.getByLabel('Tipo de vínculo').selectOption('servidor')
    await page.getByLabel('Lotação/Órgão').fill('CCHSA')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 3
    await expect(page.locator('h2:has-text("Passo 2")')).toBeHidden()

    // === PASSO 3: TRECHOS DE IDA ===
    await page.getByLabel('Origem (Cidade/UF) *').fill('João Pessoa/PB')
    await page.getByLabel('Destino (Cidade/UF) *').fill('Recife/PE')
    await page.getByLabel('Data e hora').fill('2026-06-10T08:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 4 (Ida deve estar escondido)
    await expect(page.locator('h2:has-text("Passo 3")')).toBeHidden()

    // === PASSO 4: TRECHOS DE RETORNO ===
    await page.getByLabel('Origem (Cidade/UF) *').fill('Recife/PE')
    await page.getByLabel('Destino (Cidade/UF) *').fill('João Pessoa/PB')
    await page.getByLabel('Data e hora').fill('2026-06-15T18:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 5
    await expect(page.locator('h2:has-text("Passo 4")')).toBeHidden()

    // === PASSO 5: MISSÃO ===
    await page.getByLabel('Início da missão').fill('2026-06-10T08:00')
    await page.getByLabel('Término da missão').fill('2026-06-15T18:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 6
    await expect(page.locator('h2:has-text("Passo 5")')).toBeHidden()

    // === PASSO 6: MOTIVO ===
    await page.getByLabel('Motivo da viagem').fill('Participação em congresso internacional sobre educação inclusiva')
    await page.getByLabel('Relação de pertinência').fill('O congresso está diretamente relacionado às atividades do servidor no CCHSA')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 7
    await expect(page.locator('h2:has-text("Passo 6")')).toBeHidden()

    // === PASSO 7: RECURSO ===
    await page.getByLabel('Débito em recurso').selectOption('cchsa')
    await page.locator('label:has-text("Veículo Oficial") input[type="checkbox"]').click()
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 8
    await expect(page.locator('h2:has-text("Passo 7")')).toBeHidden()

    // === PASSO 8: JUSTIFICATIVAS ===
    // Tenta avançar sem preencher a justificativa obrigatória de atraso (fora do prazo)
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Deve exibir erro de validação do campo
    await expect(page.locator('p[role="alert"]:has-text("Justificativa deve ter no mínimo 10 caracteres")')).toBeVisible()

    // Fecha o modal de erro de campos pendentes para interagir com o formulário
    await page.getByRole('button', { name: 'Corrigir agora' }).click()

    // Preenche a justificativa obrigatória de prazo
    await page.getByLabel('Justificativa fora do prazo').fill('Necessidade imperiosa de serviço e convocação extraordinária de última hora.')
    
    // Tenta avançar novamente
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 9
    await expect(page.locator('h2:has-text("Passo 8")')).toBeHidden()

    // Agora deve permitir avançar para o Passo 9: REVISÃO
    await expect(page.getByRole('button', { name: 'Gerar DOCX' })).toBeVisible()
    await expect(page.locator('span:has-text("Fora do prazo")').first()).toBeVisible()
  })

  test('Deve acusar erro se as cidades de trecho ida e retorno forem inconsistentes', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/anexo1"]')
    await page.waitForURL('**/anexo1')

    // === PASSO 1: TIPO ===
    await page.getByLabel('Tipo de solicitação').selectOption('diarias')
    await page.getByLabel('Data da solicitação').fill('2026-05-30')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 2
    await expect(page.locator('h2:has-text("Passo 1")')).toBeHidden()

    // === PASSO 2: SERVIDOR ===
    await page.getByLabel('Nome completo').fill('João Silva')
    await page.getByLabel('Cargo/Função').fill('Professor')
    await page.getByLabel('CPF').fill('529.982.247-25')
    await page.getByLabel(/^RG(\s*\*|)$/).fill('1234567')
    await page.getByLabel('Data de nascimento').fill('1980-05-15')
    await page.getByLabel('SIAPE').fill('1234567')
    await page.getByLabel('Nome da mãe').fill('Maria Silva')
    await page.getByLabel('Endereço completo').fill('Rua ABC, 123')
    await page.getByLabel('Telefone').fill('83999999999')
    await page.getByLabel('E-mail').fill('joao@example.com')
    await page.getByLabel('Banco').fill('Banco do Brasil')
    await page.getByLabel('Agência').fill('1234')
    await page.getByLabel('Conta').fill('56789')
    await page.getByLabel('Tipo de vínculo').selectOption('servidor')
    await page.getByLabel('Lotação/Órgão').fill('CCHSA')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 3
    await expect(page.locator('h2:has-text("Passo 2")')).toBeHidden()

    // === PASSO 3: TRECHOS DE IDA ===
    // Ida: João Pessoa -> Recife
    await page.getByLabel('Origem (Cidade/UF) *').fill('João Pessoa/PB')
    await page.getByLabel('Destino (Cidade/UF) *').fill('Recife/PE')
    await page.getByLabel('Data e hora').fill('2026-06-10T08:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Aguarda transição para o Passo 4
    await expect(page.locator('h2:has-text("Passo 3")')).toBeHidden()

    // === PASSO 4: TRECHOS DE RETORNO ===
    // Inconsistente: Origem do retorno é Natal/RN (deveria ser Recife/PE)
    await page.getByLabel('Origem (Cidade/UF) *').fill('Natal/RN')
    await page.getByLabel('Destino (Cidade/UF) *').fill('João Pessoa/PB')
    await page.getByLabel('Data e hora').fill('2026-06-15T18:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // Deve acusar erro na validação de sequência de trechos (exibido no modal de erros dos trechos)
    await page.screenshot({ path: '/Users/railsonsantos/Documents/GitHub/forms-on/frontend/test-results/screenshot.png' })
    await expect(page.locator('p[role="alert"]:has-text("O destino da ida deve ser o mesmo que a origem do retorno")').first()).toBeVisible()
  })

})
