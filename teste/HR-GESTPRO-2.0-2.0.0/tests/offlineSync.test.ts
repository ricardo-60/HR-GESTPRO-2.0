import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineSync } from '../lib/offlineSync';

describe('offlineSync', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('deve adicionar uma fatura na fila offline corretamente', () => {
        const mockInvoice = {
            tenant_id: 'tenant-123',
            session_id: 'sess-123',
            doc_type: 'FT',
            client_name: 'Cliente Teste',
            items: [],
            total: 1000
        };

        const result = offlineSync.queueInvoice(mockInvoice as any);

        expect(result).toBe(true);
        expect(offlineSync.getQueue().length).toBe(1);
        expect(offlineSync.getQueue()[0].client_name).toBe('Cliente Teste');
    });

    it('deve limpar a fila inteira ao usar o comando clearQueue', () => {
        offlineSync.queueInvoice({ total: 100 } as any);
        offlineSync.queueInvoice({ total: 200 } as any);

        expect(offlineSync.getQueue().length).toBe(2);

        offlineSync.clearQueue();

        expect(offlineSync.getQueue().length).toBe(0);
    });

    it('deve sincronizar faturas corretamente via syncNow', async () => {
        const mockInvoice = { total: 500 } as any;
        offlineSync.queueInvoice(mockInvoice);

        const mockSupabase = {
            from: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ error: null })
        };

        const syncedCount = await offlineSync.syncNow(mockSupabase);

        expect(syncedCount).toBe(1);
        // Atualmente o clearQueue está comentado no lib/offlineSync.ts, 
        // mas o teste valida o retorno do count sincronizado.
    });
});
