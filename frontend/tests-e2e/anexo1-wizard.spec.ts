import { test, expect } from '@playwright/test'

test.describe('Anexo I Wizard - Requisição de Viagem', () => {
  test('deve preencher a requisição passo a passo e chegar à tela de revisão', async ({ page }) => {
    // 1. Acessar a home page e clicar no link do Anexo I
    await page.goto('/')
    await expect(page).toHaveTitle(/UFPB/i)

    // Clica no card do Anexo I
    await page.click('a[href="/anexo1"]')
    await page.waitForURL('**/anexo1')

    // === PASSO 1: TIPO ===
    await page.getByLabel('Tipo de solicitação').selectOption('diarias')
    // Usamos uma data anterior para garantir que fique "Dentro do prazo" (mínimo 10 dias de antecedência)
    await page.getByLabel('Data da solicitação').fill('2026-05-30')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 2: SERVIDOR ===
    await page.getByLabel('Nome completo').fill('João Silva')
    await page.getByLabel('Cargo/Função').fill('Professor')
    await page.getByLabel('CPF').fill('529.982.247-25')
    // Usa regex para evitar colidir com Cargo/Função ou Lotação/Órgão
    await page.getByLabel(/^RG(\s*\*|)$/).fill('1234567')
    await page.getByLabel('Data de nascimento').fill('1980-05-15')
    await page.getByLabel('SIAPE').fill('1234567')
    await page.getByLabel('Nome da mãe').fill('Maria Silva')
    await page.getByLabel('Endereço completo').fill('Rua ABC, 123')
    await page.getByLabel('Telefone').fill('(83) 99999-9999')
    await page.getByLabel('E-mail').fill('joao@example.com')
    await page.getByLabel('Banco').fill('Banco do Brasil')
    await page.getByLabel('Agência').fill('1234')
    await page.getByLabel('Conta').fill('56789')
    await page.getByLabel('Tipo de vínculo').selectOption('servidor')
    await page.getByLabel('Lotação/Órgão').fill('CCHSA')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 3: TRECHOS DE IDA ===
    await page.getByLabel('Origem (Cidade/UF) *').fill('João Pessoa/PB')
    await page.getByLabel('Destino (Cidade/UF) *').fill('Recife/PE')
    await page.getByLabel('Data e hora').fill('2026-06-10T08:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 4: TRECHOS DE RETORNO ===
    await page.getByLabel('Origem (Cidade/UF) *').fill('Recife/PE')
    await page.getByLabel('Destino (Cidade/UF) *').fill('João Pessoa/PB')
    await page.getByLabel('Data e hora').fill('2026-06-15T18:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 5: MISSÃO ===
    await page.getByLabel('Início da missão').fill('2026-06-10T08:00')
    await page.getByLabel('Término da missão').fill('2026-06-15T18:00')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 6: MOTIVO ===
    await page.getByLabel('Motivo da viagem').fill('Participação em congresso internacional sobre educação inclusiva')
    await page.getByLabel('Relação de pertinência').fill('O congresso está diretamente relacionado às atividades do servidor no CCHSA')
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 7: RECURSO ===
    await page.getByLabel('Débito em recurso').selectOption('cchsa')
    // Clica no checkbox do meio de transporte "Veículo Oficial"
    await page.locator('label:has-text("Veículo Oficial") input[type="checkbox"]').click()
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 8: JUSTIFICATIVAS ===
    // Verifica se as datas estão corretas e dentro do prazo
    await expect(page.locator('span:has-text("Dentro do prazo")')).toBeVisible()
    await expect(page.locator('span:has-text("Sem Fim de Semana")')).toBeVisible()
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 9: REVISÃO ===
    await expect(page.getByRole('button', { name: 'Gerar DOCX' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gerar PDF' })).toBeVisible()
    await expect(page.locator('span:has-text("João Silva")')).toBeVisible()
  })
})
