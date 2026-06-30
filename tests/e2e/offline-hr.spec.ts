import { test, expect } from '@playwright/test';

test.describe('Fluxo de Navegação Inicial (Pré-Auth)', () => {
  test('deve navegar da LandingPage para o ecrã de Login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verificar que estamos na LandingPage
    await expect(page.locator('h1')).toContainText('Gere a tua empresa');

    // Clicar "Entrar"
    await page.click('button:has-text("Entrar")');

    // Verificar que o ecrã de Login está visível
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar no Sistema');
  });
});
