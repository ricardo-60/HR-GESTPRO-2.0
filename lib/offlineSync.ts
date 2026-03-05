export interface OfflineInvoice {
    tenant_id: string;
    session_id: string;
    doc_type: string;
    client_name: string;
    items: any[];
    total: number;
    queuedAt?: number;
}

const SYNC_KEY = 'hr_gestpro_offline_queue';

export const offlineSync = {
    queueInvoice: (invoice: OfflineInvoice) => {
        try {
            const queueStr = localStorage.getItem(SYNC_KEY) || '[]';
            const queue: OfflineInvoice[] = JSON.parse(queueStr);
            invoice.queuedAt = Date.now();
            queue.push(invoice);
            localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
            console.log('Factura faturada offline com sucesso:', invoice);
            return true;
        } catch (error) {
            console.error('Falha ao gravar na queue offline', error);
            return false;
        }
    },

    getQueue: (): OfflineInvoice[] => {
        try {
            const queueStr = localStorage.getItem(SYNC_KEY) || '[]';
            return JSON.parse(queueStr);
        } catch (error) {
            return [];
        }
    },

    clearQueue: () => {
        localStorage.removeItem(SYNC_KEY);
    },

    // A ser chamado por um global Effect quando detetar a vinda da internet
    syncNow: async (supabaseClient: any) => {
        const queue = offlineSync.getQueue();
        if (queue.length === 0) return 0;

        let syncedCount = 0;

        for (const inv of queue) {
            try {
                // TODO: Adicionar toda a lógica de rpc('generate_next_invoice_number') 
                // e insert manual como no checkout online, de modo silencioso (Background)

                // Exemplo simulado:
                console.log('A sincronizar com Supabase Backend...', inv);
                // await supabaseClient.from('invoices').insert(...)

                syncedCount++;
            } catch (error) {
                console.error('Falha na Sync de:', inv, error);
            }
        }

        // Remover da Queue caso tenham sucesso
        if (syncedCount > 0) {
            // Eliminação simulada por agora. Quando houver backend implementado isto apaga tudo o que sincronizou.
            // offlineSync.clearQueue();
        }

        return syncedCount;
    }
};
