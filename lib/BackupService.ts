import { supabase } from './supabase';

export const BackupService = {
    /**
     * Gera um backup completo dos dados do inquilino (tenant) em formato JSON.
     * Como não temos bibliotecas de ZIP (jszip) nativas, entregamos um JSON consolidado.
     */
    async generateFullBackup(tenantId: string) {
        if (!supabase) throw new Error('Supabase client not initialized');

        const tables = [
            'products',
            'customers',
            'suppliers',
            'invoices',
            'invoice_items',
            'employees',
            'departments',
            'pos_sessions'
        ];

        const backupData: Record<string, any> = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            tenant_id: tenantId,
            data: {}
        };

        try {
            for (const table of tables) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('tenant_id', tenantId);

                if (error) {
                    console.error(`Erro ao exportar tabela ${table}:`, error);
                    backupData.data[table] = [];
                } else {
                    backupData.data[table] = data || [];
                }
            }

            // Converter para string e criar download
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `HRGP_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (err: any) {
            console.error('Falha no Backup:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Exportação específica para CSV (Contabilidade)
     */
    async exportSalesToCSV(tenantId: string, month: number, year: number) {
        if (!supabase) return;

        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });

        if (error || !data) throw new Error(error?.message || 'Nenhuma venda encontrada');

        // Headers
        const headers = ['Data', 'Numero', 'Tipo', 'Cliente', 'NIF', 'Subtotal', 'IVA', 'Desconto', 'Total', 'Estado'];
        const rows = data.map(inv => [
            new Date(inv.created_at).toLocaleDateString(),
            inv.invoice_no,
            inv.doc_type,
            inv.client_name || 'Consumidor Final',
            inv.client_tax_id || '',
            inv.subtotal.toFixed(2),
            inv.tax_amount.toFixed(2),
            inv.discount_amount.toFixed(2),
            inv.total_amount.toFixed(2),
            inv.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Vendas_${month}_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
