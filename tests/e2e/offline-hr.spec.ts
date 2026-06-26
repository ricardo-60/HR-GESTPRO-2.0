import { test, expect } from '@playwright/test';

test.describe('Módulo de Recursos Humanos — Fluxo Offline-First', () => {
    test('deve permitir gerir colaboradores em modo offline com sync posterior', async ({ page }) => {
        // 1. Aceder à página inicial e efetuar login
        await page.goto('/');
        
        // Simular login
        await page.click('button:has-text("Entrar")');
        await page.fill('input[type="email"]', 'geral@hr-tecnologia.com');
        await page.fill('input[type="password"]', 'admin123'); // Password mockada no profile local
        await page.click('button[type="submit"]');

        // Navegar para Recursos Humanos
        await page.click('a[href="/hr"], button:has-text("Recursos Humanos")');
        await expect(page.locator('h2')).toContainText('Recursos Humanos');

        // 2. Simular perda de ligação à rede
        await page.context().setOffline(true);
        
        // Verificar que o UI reporta o estado Offline
        const offlineBadge = page.locator('text=Rede Local (Offline)');
        await expect(offlineBadge).toBeVisible();

        // 3. Cadastrar colaborador offline
        await page.click('button:has-text("Adicionar Colaborador")');
        await page.fill('input[placeholder*="Nome Completo"]', 'Funcionario Teste Offline');
        await page.fill('input[placeholder*="Cargo"]', 'Desenvolvedor E2E');
        await page.fill('input[placeholder*="Salário"]', '350000');
        await page.fill('input[placeholder*="BI"]', '000123456LA040');
        await page.click('button:has-text("Salvar Colaborador")');

        // Verificar que foi inserido na listagem local
        await expect(page.locator('text=Funcionario Teste Offline')).toBeVisible();
        await expect(page.locator('text=Desenvolvedor E2E')).toBeVisible();

        // 4. Verificar fila de sync pendente na barra inferior
        const syncStatus = page.locator('text=alterações pendentes');
        await expect(syncStatus).toBeVisible();

        // 5. Restabelecer ligação à rede
        await page.context().setOffline(false);

        // O syncEngine deve processar automaticamente a fila
        await page.waitForTimeout(4000); // aguardar o trigger de auto-sync

        // O status deve mudar para limpo/sincronizado
        await expect(page.locator('text=Todos os dados locais estão atualizados')).toBeVisible();
    });
});
