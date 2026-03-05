import { test, expect } from '@playwright/test';

test('deve mostrar a página de login corretamente', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('HR-GESTPRO-2.0');
});

test('deve mostrar erro ao tentar login com credenciais inválidas', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'errado@teste.com');
    await page.fill('input[type="password"]', 'senha123');
    await page.click('button[type="submit"]');

    // O Supabase demora um pouco a responder, mas o erro deve aparecer
    const errorMsg = page.locator('.bg-rose-50');
    await expect(errorMsg).toBeVisible();
});
