/**
 * Motor de Sincronização de Dados (Sync Engine)
 * Sincroniza operações em cache local (SQLite) com o Supabase Cloud
 * respeitando a ordem cronológica e aplicando resolução simples de conflitos.
 */
import { supabase } from './supabase';
import { localQuery, localExecute } from './db/localDB';
import { isOnline } from './dataLayer';

export interface SyncQueueItem {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  data: string | null;
  timestamp: number;
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'success';

let syncState: SyncState = 'idle';
let pendingOpsCount = 0;
const listeners: Array<(state: SyncState, pending: number) => void> = [];

export const syncEngine = {
  subscribe(listener: (state: SyncState, pending: number) => void) {
    listeners.push(listener);
    // Notificar imediatamente com o estado atual
    listener(syncState, pendingOpsCount);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  getState() {
    return { state: syncState, pending: pendingOpsCount };
  },

  async updatePendingCount() {
    try {
      const countRes = await localQuery('SELECT COUNT(*) as count FROM sync_queue');
      pendingOpsCount = countRes[0]?.count || 0;
      this.notify();
    } catch (e) {
      console.error('Falha ao contar operações pendentes de sync:', e);
    }
  },

  notify() {
    listeners.forEach(l => l(syncState, pendingOpsCount));
    // Disparar evento global do browser para componentes não React
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-status-change', {
        detail: { state: syncState, pending: pendingOpsCount }
      }));
    }
  },

  // Inicia o processo de sincronização das alterações locais para a cloud
  async startSync(): Promise<number> {
    if (!isOnline() || !supabase) {
      syncState = 'idle';
      await this.updatePendingCount();
      return 0;
    }

    if (syncState === 'syncing') return 0;
    
    syncState = 'syncing';
    this.notify();

    let processedCount = 0;

    try {
      // Garantir a tabela de queue
      await localExecute(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          action TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT,
          timestamp INTEGER NOT NULL
        )
      `);

      // Obter fila de operações ordenada cronologicamente
      const queue: SyncQueueItem[] = await localQuery(
        'SELECT * FROM sync_queue ORDER BY timestamp ASC'
      );

      pendingOpsCount = queue.length;
      this.notify();

      if (queue.length === 0) {
        syncState = 'success';
        this.notify();
        setTimeout(() => { syncState = 'idle'; this.notify(); }, 2000);
        return 0;
      }

      console.log(`[SyncEngine] A iniciar sincronização de ${queue.length} operações...`);

      for (const item of queue) {
        let success = false;
        
        try {
          if (item.action === 'INSERT') {
            const rowData = JSON.parse(item.data || '{}');
            // Remover metadados locais antes de enviar
            delete rowData.sync_status;
            
            const { error } = await supabase
              .from(item.table_name)
              .upsert(rowData); // Usa upsert para evitar duplicados caso o insert tenha ocorrido na nuvem a meio de uma falha anterior

            if (!error) success = true;
            else console.error(`[SyncEngine] Erro no INSERT de ${item.table_name}:`, error);

          } else if (item.action === 'UPDATE') {
            const rowData = JSON.parse(item.data || '{}');
            delete rowData.sync_status;
            
            // Lógica de resolução de conflito por timestamp:
            // Ler primeiro o estado da cloud
            const { data: cloudRow } = await supabase
              .from(item.table_name)
              .select('updated_at')
              .eq('id', item.record_id)
              .single();

            // Se o registo na cloud foi alterado por outro utilizador DEPOIS da nossa alteração local,
            // então há conflito.
            if (cloudRow && cloudRow.updated_at) {
              const cloudTime = new Date(cloudRow.updated_at).getTime();
              const localTime = new Date(rowData.updated_at).getTime();
              
              if (cloudTime > localTime) {
                console.warn(`[SyncEngine] Conflito detetado na tabela ${item.table_name} id ${item.record_id}. Cloud é mais recente.`);
                // Política "Cloud wins": Atualizar localmente com a versão da cloud e ignorar o nosso update pendente
                const { data: latestCloudData } = await supabase
                  .from(item.table_name)
                  .select('*')
                  .eq('id', item.record_id)
                  .single();

                if (latestCloudData) {
                  const keys = Object.keys(latestCloudData);
                  const vals = keys.map(k => latestCloudData[k]);
                  const setClause = keys.map(k => `${k} = ?`).join(',');
                  await localExecute(
                    `UPDATE ${item.table_name} SET ${setClause}, sync_status = 'synced' WHERE id = ?`,
                    [...vals, item.record_id]
                  );
                }
                // Marcar como sucesso para limpar a fila
                success = true;
                continue;
              }
            }

            const { error } = await supabase
              .from(item.table_name)
              .update(rowData)
              .eq('id', item.record_id);

            if (!error) success = true;
            else console.error(`[SyncEngine] Erro no UPDATE de ${item.table_name}:`, error);

          } else if (item.action === 'DELETE') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);

            if (!error) success = true;
            else console.error(`[SyncEngine] Erro no DELETE de ${item.table_name}:`, error);
          }

          if (success) {
            // Eliminar da fila local
            await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
            
            // Se for INSERT ou UPDATE, atualizar o estado local para 'synced'
            if (item.action !== 'DELETE') {
              await localExecute(
                `UPDATE ${item.table_name} SET sync_status = 'synced' WHERE id = ?`,
                [item.record_id]
              );
            }
            
            processedCount++;
            pendingOpsCount--;
            this.notify();
          } else {
            // Se falhou uma operação por erro que não de rede (ex: constraint),
            // registamos mas não bloqueamos permanentemente o resto da fila se possível.
            // Para simplicidade e consistência transacional, paramos em qualquer erro crítico de rede.
            if (!navigator.onLine) {
              throw new Error('Conexão perdida a meio do processamento da queue.');
            }
          }

        } catch (itemErr) {
          console.error(`[SyncEngine] Falha ao processar item de sync ${item.id}:`, itemErr);
          throw itemErr; // Interrompe para evitar desorganização cronológica das transações seguintes
        }
      }

      syncState = 'success';
      this.notify();
      setTimeout(() => { syncState = 'idle'; this.notify(); }, 2000);

    } catch (error) {
      console.error('[SyncEngine] Falha geral no ciclo de sincronização:', error);
      syncState = 'error';
      this.notify();
    }

    return processedCount;
  }
};

// Monitorização ativa: Quando voltar a internet, inicia o sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncEngine] Rede ativa detetada. Iniciando auto-sync...');
    setTimeout(() => {
      syncEngine.startSync().catch(err => console.error('[SyncEngine] Auto-sync falhou:', err));
    }, 3000); // pequeno delay para estabilizar ligação
  });
  
  // Ciclo automático a cada 60 segundos
  setInterval(() => {
    if (isOnline()) {
      syncEngine.startSync().catch(e => {});
    } else {
      syncEngine.updatePendingCount().catch(e => {});
    }
  }, 60000);
}
