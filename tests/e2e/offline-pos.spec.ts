import { test, expect } from '@playwright/test';

test.describe('Módulo POS (Ponto de Venda) — Fluxo Offline-First', () => {
    test('deve permitir realizar vendas offline e sincronizar ao reconectar', async ({ page }) => {
        // 1. Entrar na aplicação
        await page.goto('/');
        await page.click('button:has-text("Entrar")');
        await page.fill('input[type="email"]', 'geral@hr-tecnologia.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Navegar para o Ponto de Venda (POS)
        await page.click('a[href="/pos"], button:has-text("Venda"), button:has-text("POS")');
        
        // 2. Colocar em modo offline
        await page.context().setOffline(true);

        // Selecionar um produto da grelha de vendas (ou simular scanner)
        // Clica no primeiro item do inventário exibido
        const productItem = page.locator('.product-grid-item, .card-product').first();
        await expect(productItem).toBeVisible();
        await productItem.click();

        // Verificar que o item foi adicionado ao carrinho
        await expect(page.locator('.cart-item')).toBeVisible();

        // 3. Efetuar Pagamento / Finalizar Venda offline
        await page.click('button:has-text("Finalizar Venda"), button:has-text("Pagar")');
        await page.click('button:has-text("Confirmar"), button:has-text("Emitir Fatura")');

        // Verificar que a venda offline concluiu com sucesso localmente
        await expect(page.locator('text=Fatura gravada localmente, será sincronizada')).toBeVisible();

        // 4. Verificar alteração pendente na barra inferior de sync
        await expect(page.locator('text=alteração pendente')).toBeVisible();

        // 5. Restabelecer ligação
        await page.context().setOffline(false);

        // Aguardar o auto-sync correr
        await page.waitForTimeout(4000);

        // Verificar que a fila de sync ficou limpa
        await expect(page.locator('text=Todos os dados locais estão atualizados')).toBeVisible();
    });
});
