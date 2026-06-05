import { test, expect } from '@playwright/test'

test.describe('Anexo II Wizard - Relatório de Viagem', () => {
  test('deve preencher o relatório passo a passo e chegar à tela de revisão', async ({ page }) => {
    // 1. Acessar a home page e clicar no link do Anexo II
    await page.goto('/')
    await expect(page).toHaveTitle(/UFPB/i)

    // Clica no card do Anexo II
    await page.click('a[href="/anexo2"]')
    await page.waitForURL('**/anexo2')

    // === PASSO 1: DATA ===
    // Espera o campo de data e preenche
    const dataRelatorioInput = page.getByLabel('Data do relatório')
    await dataRelatorioInput.waitFor()
    await dataRelatorioInput.fill('2026-06-05')

    // Avança para o Passo 2
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 2: PROPOSTO ===
    // Preenche dados pessoais usando getByLabel
    await page.getByLabel('Nome completo').fill('Railson Santos')
    await page.getByLabel('CPF').fill('529.982.247-25')
    await page.getByLabel('SIAPE').fill('1234567')
    await page.getByLabel('Cargo/Função').fill('Desenvolvedor')
    await page.getByLabel('Telefone').fill('(83) 99999-9999')
    await page.getByLabel('E-mail').fill('railson@example.com')

    // Seleciona órgão de exercício
    await page.getByLabel('Órgão de exercício').selectOption('cchsa')

    // Avança para o Passo 3
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 3: AFASTAMENTO ===
    // Preenche origem, destino e data de ida para o primeiro trecho
    await page.getByLabel('Origem (Cidade/UF) *').nth(0).fill('João Pessoa/PB')
    await page.getByLabel('Destino (Cidade/UF) *').nth(0).fill('Recife/PE')
    await page.getByLabel('Data e hora').nth(0).fill('2026-06-10T08:00')

    // Preenche origem, destino e data de retorno para o segundo trecho
    await page.getByLabel('Origem (Cidade/UF) *').nth(1).fill('Recife/PE')
    await page.getByLabel('Destino (Cidade/UF) *').nth(1).fill('João Pessoa/PB')
    await page.getByLabel('Data e hora').nth(1).fill('2026-06-12T18:00')

    // Avança para o Passo 4
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 4: ATIVIDADES ===
    // Preenche a primeira linha da tabela de atividades
    // Selecionamos os inputs da primeira linha da tabela
    const firstRowInputs = page.locator('tbody >> nth=1 >> tr >> nth=0 >> input')
    await firstRowInputs.nth(0).fill('2026-06-10') // Data
    await firstRowInputs.nth(1).fill('09:00')      // Horário
    await firstRowInputs.nth(2).fill('Recife/PE')   // Cidade
    await firstRowInputs.nth(3).fill('Participação em reuniões técnicas') // Atividade *

    // Avança para o Passo 5
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 5: PRAZO ===
    // Verifica se o status é dentro do prazo
    await expect(page.locator('span:has-text("Dentro do prazo")')).toBeVisible()

    // Avança para o Passo 6
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 6: CONFIRMAÇÃO ===
    // Seleciona que a viagem foi realizada
    await page.getByLabel('A viagem foi realizada?').selectOption('sim')

    // Avança para o Passo 7 (Revisão)
    await page.getByRole('button', { name: 'Avançar' }).click()

    // === PASSO 7: REVISÃO ===
    // Verifica se o resumo de revisão é exibido com os botões de download
    await expect(page.getByRole('button', { name: 'Gerar DOCX' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gerar PDF' })).toBeVisible()
    await expect(page.locator('span:has-text("Railson Santos")')).toBeVisible()
  })
})
