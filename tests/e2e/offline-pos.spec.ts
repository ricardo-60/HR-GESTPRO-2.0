import { test, expect } from '@playwright/test';

test.describe('Fluxo de Login — Interação', () => {
  test('deve mostrar campos de login ao clicar Entrar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Clicar "Entrar" na LandingPage
    await page.click('button:has-text("Entrar")');

    // Verificar campos
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar no Sistema');
  });

  test('deve mostrar ecrã de recuperação de senha', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Entrar")');

    // Clicar "Esqueci-me"
    await page.click('button:has-text("Esqueci-me")');

    // Verificar texto de recuperação
    await expect(page.locator('text=Recuperação de Acesso')).toBeVisible({ timeout: 5000 });
  });
});
