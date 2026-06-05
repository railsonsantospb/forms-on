import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibilidade (axe-core)', () => {
  test('home page não deve ter violações críticas ou sérias', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    // Filtrar apenas violações (não inclusões incompletas)
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )

    expect(criticalOrSerious).toEqual([])
  })

  test('anexo 1 wizard não deve ter violações críticas ou sérias', async ({ page }) => {
    await page.goto('/anexo1')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )

    expect(criticalOrSerious).toEqual([])
  })

  test('anexo 2 wizard não deve ter violações críticas ou sérias', async ({ page }) => {
    await page.goto('/anexo2')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )

    expect(criticalOrSerious).toEqual([])
  })

  test('página 404 não deve ter violações críticas ou sérias', async ({ page }) => {
    await page.goto('/pagina-inexistente')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )

    expect(criticalOrSerious).toEqual([])
  })
})
