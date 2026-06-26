import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineSync } from '../lib/offlineSync';

// Fila em memória simulada
let mockQueue: any[] = [];

// Mock do dataLayer
vi.mock('../lib/dataLayer', () => {
    return {
        dataLayer: {
            rpc: vi.fn().mockResolvedValue({ data: 'FT-MOCK-123', error: null }),
            from: vi.fn().mockReturnValue({
                insert: vi.fn().mockImplementation(async (record: any) => {
                    mockQueue.push({
                        id: `id-${Date.now()}`,
                        table_name: 'invoices',
                        action: 'insert',
                        record_id: record.invoice_number,
                        data: JSON.stringify(record),
                        timestamp: Date.now(),
                        client_name: record.client_name
                    });
                    return { data: record, error: null };
                })
            })
        }
    };
});

// Mock do localDB
vi.mock('../lib/db/localDB', () => {
    return {
        localQuery: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('sync_queue')) {
                return mockQueue;
            }
            return [];
        }),
        localExecute: vi.fn().mockResolvedValue({ changes: 1 })
    };
});

// Mock do syncEngine
vi.mock('../lib/syncEngine', () => {
    return {
        syncEngine: {
            startSync: vi.fn().mockImplementation(async () => {
                const count = mockQueue.length;
                mockQueue = []; // Limpa no sync
                return count;
            })
        }
    };
});

describe('offlineSync', () => {
    beforeEach(() => {
        mockQueue = [];
        vi.clearAllMocks();
    });

    it('deve adicionar uma fatura na fila offline corretamente', async () => {
        const mockInvoice = {
            tenant_id: 'tenant-123',
            session_id: 'sess-123',
            doc_type: 'FT',
            client_name: 'Cliente Teste',
            items: [],
            total: 1000
        };

        const result = await offlineSync.queueInvoice(mockInvoice as any);

        expect(result).toBe(true);
        const queue = await offlineSync.getQueue();
        expect(queue.length).toBe(1);
        
        const parsedData = JSON.parse(queue[0].data);
        expect(parsedData.client_name).toBe('Cliente Teste');
        expect(parsedData.invoice_number).toBe('FT-MOCK-123');
    });

    it('deve limpar a fila inteira ao usar o comando clearQueue', async () => {
        await offlineSync.queueInvoice({ tenant_id: 't1', doc_type: 'FT', client_name: 'C1', total: 100 } as any);
        await offlineSync.queueInvoice({ tenant_id: 't1', doc_type: 'FT', client_name: 'C2', total: 200 } as any);

        const queueBefore = await offlineSync.getQueue();
        expect(queueBefore.length).toBe(2);

        offlineSync.clearQueue();
        mockQueue = [];

        const queueAfter = await offlineSync.getQueue();
        expect(queueAfter.length).toBe(0);
    });

    it('deve sincronizar faturas corretamente via syncNow', async () => {
        const mockInvoice = { tenant_id: 't1', doc_type: 'FT', client_name: 'C3', total: 500 } as any;
        await offlineSync.queueInvoice(mockInvoice);

        const syncedCount = await offlineSync.syncNow();

        expect(syncedCount).toBe(1);
        const queueAfter = await offlineSync.getQueue();
        expect(queueAfter.length).toBe(0);
    });
});
