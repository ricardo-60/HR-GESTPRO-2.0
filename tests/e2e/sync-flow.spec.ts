import { test, expect } from '@playwright/test';

test.describe('Navegação e Estado da Aplicação', () => {
  test('deve carregar LandingPage e mostrar botão Entrar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verificar elementos principais da LandingPage
    await expect(page.locator('h1')).toContainText('Gere a tua empresa');

    // O botão "Entrar" aparece 2x na LandingPage (navbar + hero). Usar .first()
    const entrarButtons = page.locator('button').filter({ hasText: 'Entrar' });
    await expect(entrarButtons.first()).toBeVisible();
    await expect(entrarButtons).toHaveCount(2); // navbar + hero
  });

  test('deve navegar para Login a partir do botão Entrar da navbar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Clicar no primeiro botão "Entrar" (navbar)
    await page.locator('button').filter({ hasText: 'Entrar' }).first().click();

    // Verificar que o ecrã de Login carregou
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1:has-text("HR-GESTPRO")')).toBeVisible();
  });
});
