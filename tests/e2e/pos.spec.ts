import { test, expect } from '@playwright/test';

test('deve permitir interagir com os elementos de login', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Entrar")');

    // Verificar campos de input
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verificar botão de submit
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar no Sistema');
});

test('deve navegar para recuperação de senha', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Entrar")');
    await page.click('button:has-text("Esqueci-me")');
    await expect(page.locator('text=Recuperação de Acesso')).toBeVisible();
});
