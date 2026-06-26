import { test, expect } from '@playwright/test';

test.describe('Sync Engine — Resolução de Conflitos e Consistência', () => {
    test('deve resolver conflitos de dados aplicando a política do mais recente', async ({ page }) => {
        // 1. Aceder e autenticar na app
        await page.goto('/');
        await page.click('button:has-text("Entrar")');
        await page.fill('input[type="email"]', 'geral@hr-tecnologia.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Navegar para Recursos Humanos
        await page.click('a[href="/hr"]');
        await expect(page.locator('h2')).toContainText('Recursos Humanos');

        // 2. Simular modo offline
        await page.context().setOffline(true);

        // Alterar localmente um colaborador existente (por exemplo, mudar o status de ativo para férias)
        const employeeStatusSelect = page.locator('select').first();
        await expect(employeeStatusSelect).toBeVisible();
        await employeeStatusSelect.selectOption('on_leave'); // Férias localmente

        // Verificar que o UI regista a alteração como pendente de sync
        await expect(page.locator('text=alteração pendente')).toBeVisible();

        // 3. Simular que, em paralelo, a cloud recebeu uma alteração posterior
        // Mockamos a resposta do Supabase select para retornar um registro modificado na cloud
        // com um timestamp updated_at mais recente do que a nossa edição local.
        await page.route('**/rest/v1/employees*', async (route) => {
            if (route.request().method() === 'GET') {
                // Retorna um colaborador modificado há segundos na cloud com estado 'inactive'
                const mockEmployee = [{
                    id: 'emp-123',
                    tenant_id: 'tenant-123',
                    full_name: 'Colaborador E2E Conflito',
                    role: 'Programador',
                    base_salary: 400000,
                    status: 'inactive', // Estado alterado na cloud
                    updated_at: new Date(Date.now() + 10000).toISOString(), // 10s no futuro (mais recente)
                    created_at: new Date().toISOString()
                }];
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockEmployee)
                });
            } else {
                route.continue();
            }
        });

        // 4. Conectar de volta e disparar sincronização
        await page.context().setOffline(false);
        
        // Aguardar o sync automático processar o conflito
        await page.waitForTimeout(4000);

        // Como o timestamp da cloud era mais recente, a política "Cloud Wins"
        // deve ter sido aplicada: a nossa alteração local de 'on_leave' foi descartada,
        // e o estado local foi sobrescrito para o estado mais recente da cloud ('inactive').
        // Vamos verificar se o select no UI mostra 'inactive'
        await expect(employeeStatusSelect).toHaveValue('inactive');

        // E a fila de alterações deve estar vazia (conflito resolvido)
        await expect(page.locator('text=Todos os dados locais estão atualizados')).toBeVisible();
    });
});
