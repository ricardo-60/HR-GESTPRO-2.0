import { dataLayer } from './dataLayer';
import { syncEngine } from './syncEngine';
import { localQuery } from './db/localDB';

export interface OfflineInvoice {
    tenant_id: string;
    session_id: string;
    doc_type: string;
    client_name: string;
    items: any[];
    total: number;
    queuedAt?: number;
}

// Chave depreciada do localStorage
const SYNC_KEY = 'hr_gestpro_offline_queue';

export const offlineSync = {
    // Mantido por compatibilidade de assinatura, mas agora grava diretamente no SQLite local via dataLayer
    queueInvoice: async (invoice: OfflineInvoice) => {
        try {
            console.log('[OfflineSync] Enfileirando fatura offline...', invoice);
            
            // Gerar número de fatura local
            const { data: invoiceNum } = await dataLayer.rpc('generate_next_invoice_number', {
                p_tenant_id: invoice.tenant_id,
                p_doc_type: invoice.doc_type
            });

            const invoiceRecord = {
                tenant_id: invoice.tenant_id,
                invoice_number: invoiceNum || `FT-TEMP-${Date.now()}`,
                doc_type: invoice.doc_type,
                client_name: invoice.client_name,
                total_amount: invoice.total,
                status: 'draft',
                items: JSON.stringify(invoice.items),
                created_at: new Date().toISOString()
            };

            const result = await dataLayer.from('invoices').insert(invoiceRecord);
            
            if (result.error) throw new Error(result.error.message);
            
            console.log('[OfflineSync] Fatura gravada localmente com sucesso:', invoiceNum);
            return true;
        } catch (error) {
            console.error('[OfflineSync] Falha ao enfileirar fatura no SQLite:', error);
            return false;
        }
    },

    // Retorna a contagem de faturas locais pendentes de sincronização
    getQueue: async (): Promise<any[]> => {
        try {
            return await localQuery(
                "SELECT * FROM sync_queue WHERE table_name = 'invoices'"
            );
        } catch (e) {
            return [];
        }
    },

    clearQueue: () => {
        console.warn('[OfflineSync] clearQueue foi depreciada. Use o SyncEngine para processar faturas.');
    },

    // Dispara a sincronização manual
    syncNow: async (supabaseClient?: any) => {
        console.log('[OfflineSync] Disparando ciclo de sincronização global...');
        return await syncEngine.startSync();
    }
};
