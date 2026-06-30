/**
 * Motor de Sincronização de Dados (Sync Engine)
 * Sincroniza operações em cache local (SQLite) com o Supabase Cloud
 * respeitando a ordem cronológica e aplicando:
 *   - Resolução de conflitos por timestamp ("Cloud wins")
 *   - Retry exponencial em falhas de rede/intermitentes
 *   - Limite máximo de tentativas antes de desistência
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
  retry_count?: number;
  last_error?: string | null;
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'success';

let syncState: SyncState = 'idle';
let pendingOpsCount = 0;
let currentRetryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners: Array<(state: SyncState, pending: number) => void> = [];

// ==============================================================================
// CONFIGURAÇÃO DE RETRY EXPONENCIAL
// ==============================================================================
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1_000;   // 1 segundo
const MAX_DELAY_MS = 60_000;    // 60 segundos (cap)

/**
 * Calcula o delay para retry exponencial com jitter.
 * Fórmula: min(BASE * 2^tentativa, MAX) + jitter aleatório de 0-1000ms
 * Isso evita o "thundering herd" em múltiplos clientes a reconectar.
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    BASE_DELAY_MS * Math.pow(2, attempt),
    MAX_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * 1000); // 0-1000ms
  return exponentialDelay + jitter;
}

/**
 * Determina se um erro é de rede (transitório) vs erro de domínio (permanente).
 * Erros de rede devem ser retentados. Erros de domínio (constraint, validação) não.
 */
function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.toString() || '').toLowerCase();
  const isNetwork = 
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('eaddrnotavail') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('dns') ||
    msg.includes('socket') ||
    msg.includes('connection lost') ||
    msg.includes('conexão perdida') ||
    msg.includes('sem conexão') ||
    error.status === 0 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504;

  // Também verificar se o navegador perdeu a conectividade
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  return isNetwork;
}

// ==============================================================================
// SYNC ENGINE
// ==============================================================================
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
      console.error('[SyncEngine] Falha ao contar operações pendentes:', e);
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

  /**
   * Cancela qualquer retry pendente (útil para reset manual).
   */
  cancelRetry() {
    if (currentRetryTimer !== null) {
      clearTimeout(currentRetryTimer);
      currentRetryTimer = null;
    }
  },

  /**
   * Agenda um novo ciclo de sync após delay exponencial.
   */
  scheduleRetry(attempt: number) {
    this.cancelRetry();
    const delay = calculateRetryDelay(attempt);
    console.log(`[SyncEngine] Retry agendado em ${delay}ms (tentativa ${attempt + 1}/${MAX_RETRIES})...`);

    syncState = 'idle';
    this.notify();

    currentRetryTimer = setTimeout(async () => {
      console.log(`[SyncEngine] Executando retry #${attempt + 1}...`);
      currentRetryTimer = null;
      try {
        await this.startSync(attempt + 1); // Passa o contador de tentativas
      } catch (err) {
        console.error('[SyncEngine] Retry também falhou:', err);
      }
    }, delay);
  },

  /**
   * Garante que a tabela sync_queue tem as colunas necessárias (incluindo retry).
   * A migração é segura: ADD COLUMN IF NOT EXISTS não está disponível no SQLite,
   * por isso usamos uma verificação pragmática.
   */
  async ensureQueueTable() {
    await localExecute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        action TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      )
    `);
  },

  /**
   * Inicia o processo de sincronização das alterações locais para a cloud.
   * @param attemptNumber Número da tentativa atual (0 = primeira tentativa)
   */
  async startSync(attemptNumber: number = 0): Promise<number> {
    // Cancelar qualquer retry pendente ao iniciar um novo ciclo
    this.cancelRetry();

    if (!isOnline() || !supabase) {
      syncState = 'idle';
      await this.updatePendingCount();
      return 0;
    }

    if (syncState === 'syncing') return 0;
    
    syncState = 'syncing';
    this.notify();

    let processedCount = 0;
    let hasNetworkErrors = false;
    let maxRetriesExceeded = false;

    try {
      await this.ensureQueueTable();

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

      console.log(`[SyncEngine] A iniciar sincronização de ${queue.length} operações (tentativa #${attemptNumber})...`);

      for (const item of queue) {
        // Se este item já excedeu o limite de retries, desistimos permanentemente
        const currentRetries = item.retry_count || 0;
        if (currentRetries >= MAX_RETRIES) {
          console.error(
            `[SyncEngine] Desistindo do item ${item.id} (${item.table_name}/${item.action}) ` +
            `após ${currentRetries} tentativas falhadas. Último erro: ${item.last_error || 'desconhecido'}`
          );
          await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
          pendingOpsCount--;
          this.notify();
          maxRetriesExceeded = true;
          continue;
        }

        let success = false;
        
        try {
          if (item.action === 'INSERT') {
            const rowData = JSON.parse(item.data || '{}');
            delete rowData.sync_status;
            
            const { error } = await supabase
              .from(item.table_name)
              .upsert(rowData);

            if (!error) success = true;
            else if (isNetworkError(error)) {
              throw new Error(`Erro de rede no INSERT: ${error.message}`);
            } else {
              console.error(`[SyncEngine] Erro permanente no INSERT de ${item.table_name}:`, error);
              // Erro permanente (ex: constraint, validação) — remover da fila
              await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
              pendingOpsCount--;
              this.notify();
              processedCount++;
              continue;
            }

          } else if (item.action === 'UPDATE') {
            const rowData = JSON.parse(item.data || '{}');
            delete rowData.sync_status;
            
            // Resolução de conflito por timestamp
            const { data: cloudRow, error: readError } = await supabase
              .from(item.table_name)
              .select('updated_at')
              .eq('id', item.record_id)
              .single();

            if (readError && isNetworkError(readError)) {
              throw new Error(`Erro de rede na leitura de conflito: ${readError.message}`);
            }

            if (cloudRow && cloudRow.updated_at) {
              const cloudTime = new Date(cloudRow.updated_at).getTime();
              const localTime = new Date(rowData.updated_at).getTime();
              
              if (cloudTime > localTime) {
                console.warn(`[SyncEngine] Conflito em ${item.table_name}/${item.record_id}. Cloud mais recente. Aplicando "Cloud wins".`);
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
                success = true;
              }
            }

            if (!success) {
              const { error } = await supabase
                .from(item.table_name)
                .update(rowData)
                .eq('id', item.record_id);

              if (!error) success = true;
              else if (isNetworkError(error)) {
                throw new Error(`Erro de rede no UPDATE: ${error.message}`);
              } else {
                console.error(`[SyncEngine] Erro permanente no UPDATE de ${item.table_name}:`, error);
                await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
                pendingOpsCount--;
                this.notify();
                processedCount++;
                continue;
              }
            }

          } else if (item.action === 'DELETE') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);

            if (!error) success = true;
            else if (isNetworkError(error)) {
              throw new Error(`Erro de rede no DELETE: ${error.message}`);
            } else {
              console.error(`[SyncEngine] Erro permanente no DELETE de ${item.table_name}:`, error);
              await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
              pendingOpsCount--;
              this.notify();
              processedCount++;
              continue;
            }
          }

          if (success) {
            await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
            
            if (item.action !== 'DELETE') {
              await localExecute(
                `UPDATE ${item.table_name} SET sync_status = 'synced' WHERE id = ?`,
                [item.record_id]
              );
            }
            
            processedCount++;
            pendingOpsCount--;
            this.notify();
          }

        } catch (itemErr: any) {
          // Se for erro de rede, incrementar retry e continuar com os próximos itens
          if (isNetworkError(itemErr)) {
            const newRetryCount = currentRetries + 1;
            hasNetworkErrors = true;
            
            console.warn(
              `[SyncEngine] Erro de rede no item ${item.id} ` +
              `(${item.table_name}/${item.action}). Retry ${newRetryCount}/${MAX_RETRIES}.`
            );

            // Atualizar o contador de retry e a mensagem de erro no registo da queue
            await localExecute(
              `UPDATE sync_queue SET retry_count = ?, last_error = ? WHERE id = ?`,
              [newRetryCount, itemErr.message?.substring(0, 500) || 'Erro de rede', item.id]
            );
            
            // NÃO descartamos o item — ele permanece na fila para o próximo ciclo
            pendingOpsCount--; // (foi contado no início, mas não removido)
            this.notify();
          } else {
            // Erro não-rede (inesperado) — registar e remover, marcar como conflito
            console.error(`[SyncEngine] Erro inesperado no item ${item.id}:`, itemErr);
            await localExecute('DELETE FROM sync_queue WHERE id = ?', [item.id]);
            await localExecute(
              `UPDATE ${item.table_name} SET sync_status = 'conflict' WHERE id = ?`,
              [item.record_id]
            );
            pendingOpsCount--;
            this.notify();
            processedCount++;
          }
        }
      }

      // Após processar toda a fila:
      if (hasNetworkErrors) {
        // Recalcular o total pendente (itens que falharam por rede continuam na fila)
        const remainingCount = await localQuery('SELECT COUNT(*) as count FROM sync_queue');
        pendingOpsCount = remainingCount[0]?.count || 0;
        this.notify();

        // Agendar retry com backoff exponencial (passando o número da tentativa atual + 1)
        this.scheduleRetry(attemptNumber);
        
        // Informar mas não como erro — é aguardado em conexões intermitentes
        console.log(
          `[SyncEngine] Ciclo concluído com ${processedCount} processados, ` +
          `${pendingOpsCount} pendentes. Retry agendado (tentativa ${attemptNumber + 1}).`
        );
        
        // Estado como 'error' se nothing was processed OR idle se alguns foram processados
        syncState = processedCount > 0 ? 'idle' : 'error';
        this.notify();
        return processedCount;
      }

      // Sucesso total — todos os itens foram processados
      syncState = 'success';
      this.notify();
      setTimeout(() => {
        syncState = 'idle';
        this.notify();
        if (maxRetriesExceeded) {
          console.warn('[SyncEngine] Alguns itens foram descartados por excederem o limite de retries.');
        }
      }, 2000);

    } catch (error: any) {
      console.error('[SyncEngine] Falha geral no ciclo de sincronização:', error);
      
      // Se for erro de rede mesmo no setup inicial, agenda retry
      if (isNetworkError(error)) {
        hasNetworkErrors = true;
        this.scheduleRetry(attemptNumber);
      }
      
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
    // Cancelar qualquer retry pendente para evitar concorrência
    syncEngine.cancelRetry();
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
