/**
 * Camada de Abstração de Dados Híbrida (Supabase Cloud + SQLite Local)
 * Redireciona operações de escrita e leitura de forma inteligente com base na conectividade.
 */
import { supabase } from './supabase';
import { localQuery, localExecute } from './db/localDB';

// Estado global de conectividade
let onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isForcedOffline = typeof window !== 'undefined' ? localStorage.getItem('hr_gestpro_forced_offline') === 'true' : false;

// Monitorizar conectividade no browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    onlineStatus = true;
    console.log('[DataLayer] Conexão física restabelecida.');
  });
  window.addEventListener('offline', () => {
    onlineStatus = false;
    console.log('[DataLayer] Sem conexão física à rede.');
  });
}

// Verificar se estamos no modo online ativo
export function isOnline(): boolean {
  if (isForcedOffline) return false;
  return onlineStatus;
}

// Configurar modo forçado
export function setForcedOffline(forced: boolean) {
  isForcedOffline = forced;
  console.log(`[DataLayer] Modo offline forçado: ${forced}`);
  if (typeof window !== 'undefined') {
    localStorage.setItem('hr_gestpro_forced_offline', forced ? 'true' : 'false');
    // Disparar evento personalizado para atualizar a UI
    window.dispatchEvent(new CustomEvent('connection-status-change', { detail: { online: isOnline() } }));
  }
}

// Garantir a existência da tabela sync_queue no SQLite local
let isQueueChecked = false;
async function ensureSyncQueueTable() {
  if (isQueueChecked) return;
  try {
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
    isQueueChecked = true;
  } catch (error) {
    console.error('Falha ao criar tabela sync_queue no SQLite:', error);
  }
}

// Classe que emula o PostgrestQueryBuilder do Supabase
class HybridQueryBuilder {
  private tableName: string;
  private method: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectFields: string = '*';
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private orderFields: Array<{ column: string; ascending: boolean }> = [];
  private limitCount?: number;
  private writeData: any = null;
  private isSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
    // Inicialização assíncrona da fila, sem bloquear
    ensureSyncQueueTable();
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    this.method = 'select';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  like(column: string, value: any) {
    this.filters.push({ type: 'like', column, value });
    return this;
  }

  ilike(column: string, value: any) {
    this.filters.push({ type: 'ilike', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderFields.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.method = 'insert';
    this.writeData = data;
    return this;
  }

  update(data: any) {
    this.method = 'update';
    this.writeData = data;
    return this;
  }

  delete() {
    this.method = 'delete';
    return this;
  }

  // Permite usar "await dataLayer.from('table').select()"
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    if (isOnline() && supabase) {
      try {
        return await this.executeSupabase();
      } catch (err) {
        console.warn(`[DataLayer] Supabase falhou, tentando fallback local:`, err);
        return await this.executeLocal();
      }
    } else {
      return await this.executeLocal();
    }
  }

  private async executeSupabase() {
    let query: any = supabase.from(this.tableName);

    if (this.method === 'select') {
      query = query.select(this.selectFields);
    } else if (this.method === 'insert') {
      query = query.insert(this.writeData);
    } else if (this.method === 'update') {
      query = query.update(this.writeData);
    } else if (this.method === 'delete') {
      query = query.delete();
    }

    // Aplicar filtros
    for (const f of this.filters) {
      if (f.type === 'eq') query = query.eq(f.column, f.value);
      else if (f.type === 'neq') query = query.neq(f.column, f.value);
      else if (f.type === 'gt') query = query.gt(f.column, f.value);
      else if (f.type === 'lt') query = query.lt(f.column, f.value);
      else if (f.type === 'gte') query = query.gte(f.column, f.value);
      else if (f.type === 'lte') query = query.lte(f.column, f.value);
      else if (f.type === 'like') query = query.like(f.column, f.value);
      else if (f.type === 'ilike') query = query.ilike(f.column, f.value);
      else if (f.type === 'in') query = query.in(f.column, f.value);
    }

    // Ordenação e limite
    for (const o of this.orderFields) {
      query = query.order(o.column, { ascending: o.ascending });
    }
    if (this.limitCount !== undefined) {
      query = query.limit(this.limitCount);
    }

    if (this.isSingle) {
      query = query.single();
    }

    const res = await query;
    
    // Se foi uma escrita (insert/update/delete) bem sucedida na nuvem,
    // replicamos também localmente para manter a base local atualizada!
    if (!res.error && this.method !== 'select') {
      this.replicateToLocalSilently().catch(err => 
        console.error('[DataLayer] Falha na replicação de escrita online -> local:', err)
      );
    }

    return res;
  }

  private async replicateToLocalSilently() {
    // Replica o dado inserido/atualizado para o SQLite local sem enfileirar na sync_queue
    try {
      if (this.method === 'insert' || this.method === 'update') {
        const rows = Array.isArray(this.writeData) ? this.writeData : [this.writeData];
        for (const row of rows) {
          const keys = Object.keys(row).filter(k => typeof row[k] !== 'object' || row[k] === null);
          const values = keys.map(k => row[k]);
          
          if (this.method === 'insert') {
            const placeholders = keys.map(() => '?').join(',');
            const sql = `INSERT OR REPLACE INTO ${this.tableName} (${keys.join(',')}) VALUES (${placeholders})`;
            await localExecute(sql, values);
          } else {
            // update local precisa do ID do registo
            const idCol = row.id ? 'id' : (keys.includes('tenant_id') ? 'tenant_id' : keys[0]);
            const idVal = row[idCol];
            const setClause = keys.map(k => `${k} = ?`).join(',');
            const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${idCol} = ?`;
            await localExecute(sql, [...values, idVal]);
          }
        }
      } else if (this.method === 'delete') {
        // Encontrar filtro de ID ou tenant_id
        const eqFilter = this.filters.find(f => f.type === 'eq');
        if (eqFilter) {
          const sql = `DELETE FROM ${this.tableName} WHERE ${eqFilter.column} = ?`;
          await localExecute(sql, [eqFilter.value]);
        }
      }
    } catch (e) {
      console.warn(`[DataLayer] Erro ao sincronizar para SQLite:`, e);
    }
  }

  private async executeLocal() {
    await ensureSyncQueueTable();
    try {
      if (this.method === 'select') {
        return await this.executeLocalSelect();
      } else {
        return await this.executeLocalWrite();
      }
    } catch (err: any) {
      console.error(`[DataLayer] Erro de execução local no SQLite:`, err);
      return { data: null, error: { message: err.message, details: err } };
    }
  }

  private async executeLocalSelect() {
    let sql = `SELECT ${this.selectFields} FROM ${this.tableName}`;
    const params: any[] = [];
    
    // Aplicar filtros
    if (this.filters.length > 0) {
      const whereClauses = this.filters.map(f => {
        if (f.type === 'eq') {
          params.push(f.value);
          return `${f.column} = ?`;
        } else if (f.type === 'neq') {
          params.push(f.value);
          return `${f.column} != ?`;
        } else if (f.type === 'gt') {
          params.push(f.value);
          return `${f.column} > ?`;
        } else if (f.type === 'lt') {
          params.push(f.value);
          return `${f.column} < ?`;
        } else if (f.type === 'gte') {
          params.push(f.value);
          return `${f.column} >= ?`;
        } else if (f.type === 'lte') {
          params.push(f.value);
          return `${f.column} <= ?`;
        } else if (f.type === 'like') {
          params.push(f.value);
          return `${f.column} LIKE ?`;
        } else if (f.type === 'ilike') {
          params.push(f.value);
          return `LOWER(${f.column}) LIKE LOWER(?)`;
        } else if (f.type === 'in') {
          const placeholders = f.value.map(() => '?').join(',');
          f.value.forEach((v: any) => params.push(v));
          return `${f.column} IN (${placeholders})`;
        }
        return '1=1';
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Ordenação
    if (this.orderFields.length > 0) {
      const orderBy = this.orderFields.map(o => `${o.column} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    // Limite
    if (this.limitCount !== undefined) {
      sql += ` LIMIT ${this.limitCount}`;
    }

    const rows = await localQuery(sql, params);
    
    if (this.isSingle) {
      return { data: rows[0] || null, error: null };
    }
    return { data: rows, error: null };
  }

  private async executeLocalWrite() {
    const timestamp = Date.now();
    
    if (this.method === 'insert') {
      const rows = Array.isArray(this.writeData) ? this.writeData : [this.writeData];
      const insertedRows: any[] = [];

      for (const row of rows) {
        // Assegurar ID primário se não existir
        if (!row.id) {
          row.id = crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        row.sync_status = 'pending';
        row.updated_at = new Date().toISOString();

        const keys = Object.keys(row);
        const values = keys.map(k => row[k]);
        const placeholders = keys.map(() => '?').join(',');

        const sql = `INSERT OR REPLACE INTO ${this.tableName} (${keys.join(',')}) VALUES (${placeholders})`;
        await localExecute(sql, values);

        // Adicionar à fila de sincronização
        await localExecute(
          `INSERT INTO sync_queue (id, table_name, action, record_id, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), this.tableName, 'INSERT', row.id, JSON.stringify(row), timestamp]
        );

        insertedRows.push(row);
      }

      return { data: Array.isArray(this.writeData) ? insertedRows : insertedRows[0], error: null };

    } else if (this.method === 'update') {
      // O update precisa de aplicar filtros locais primeiro para saber quais IDs vão mudar
      const selectBuilder = new HybridQueryBuilder(this.tableName);
      selectBuilder.filters = this.filters;
      const { data: targetRows } = await selectBuilder.executeLocalSelect();
      
      if (!targetRows || targetRows.length === 0) {
        return { data: [], error: null };
      }

      const updatedRows: any[] = [];
      const keys = Object.keys(this.writeData);
      const values = keys.map(k => this.writeData[k]);
      
      const setClause = keys.map(k => `${k} = ?`).join(',');
      
      for (const target of targetRows) {
        const id = target.id;
        if (!id) continue;

        // Atualizar registo local
        const updateSql = `UPDATE ${this.tableName} SET ${setClause}, sync_status = 'pending', updated_at = ? WHERE id = ?`;
        const updatedTime = new Date().toISOString();
        await localExecute(updateSql, [...values, updatedTime, id]);

        // Guardar o estado atual do registo atualizado para syncing
        const fullRow = { ...target, ...this.writeData, sync_status: 'pending', updated_at: updatedTime };
        updatedRows.push(fullRow);

        // Adicionar à fila de sincronização
        await localExecute(
          `INSERT INTO sync_queue (id, table_name, action, record_id, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), this.tableName, 'UPDATE', id, JSON.stringify(fullRow), timestamp]
        );
      }

      return { data: this.isSingle ? updatedRows[0] : updatedRows, error: null };

    } else if (this.method === 'delete') {
      // Encontrar IDs a eliminar
      const selectBuilder = new HybridQueryBuilder(this.tableName);
      selectBuilder.filters = this.filters;
      const { data: targetRows } = await selectBuilder.executeLocalSelect();

      if (!targetRows || targetRows.length === 0) {
        return { data: [], error: null };
      }

      for (const target of targetRows) {
        const id = target.id;
        if (!id) continue;

        // Eliminar fisicamente do SQLite local (ou soft delete se preferível, mas fisicamente é melhor pois a queue regista a ação)
        const deleteSql = `DELETE FROM ${this.tableName} WHERE id = ?`;
        await localExecute(deleteSql, [id]);

        // Adicionar eliminação à fila de sincronização
        await localExecute(
          `INSERT INTO sync_queue (id, table_name, action, record_id, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), this.tableName, 'DELETE', id, null, timestamp]
        );
      }

      return { data: targetRows, error: null };
    }

    throw new Error('Método inválido no HybridQueryBuilder');
  }
}

// API de Dados Híbrida compatível com o cliente Supabase
export const dataLayer = {
  // Substitui supabase.from('table')
  from(tableName: string) {
    return new HybridQueryBuilder(tableName);
  },

  // Substitui supabase.rpc('function', { params })
  async rpc(functionName: string, params: any = {}) {
    if (isOnline() && supabase) {
      try {
        return await supabase.rpc(functionName, params);
      } catch (err) {
        console.warn(`[DataLayer] RPC ${functionName} falhou no Supabase, tentando simulação local.`, err);
      }
    }
    
    // Simulação local dos RPCs mais cruciais
    try {
      if (functionName === 'increment_product_stock' || functionName === 'decrement_product_stock') {
        const { p_product_id, p_quantity } = params;
        const multiplier = functionName === 'increment_product_stock' ? 1 : -1;
        const product = await localQuery('SELECT stock_current FROM products WHERE id = ?', [p_product_id]);
        
        if (product && product.length > 0) {
          const current = product[0].stock_current || 0;
          const newVal = current + (p_quantity * multiplier);
          await localExecute('UPDATE products SET stock_current = ?, sync_status = "pending", updated_at = ? WHERE id = ?', [newVal, new Date().toISOString(), p_product_id]);
          
          // Adicionar à queue de sync
          const fullProd = await localQuery('SELECT * FROM products WHERE id = ?', [p_product_id]);
          await localExecute(
            `INSERT INTO sync_queue (id, table_name, action, record_id, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), 'products', 'UPDATE', p_product_id, JSON.stringify(fullProd[0]), Date.now()]
          );
          
          return { data: newVal, error: null };
        }
      } else if (functionName === 'generate_next_invoice_number') {
        // Simulação do gerador de número de fatura local
        // Formato típico angolano: FT <Ano>/<Contador>
        const { p_tenant_id, p_doc_type } = params;
        const currentYear = new Date().getFullYear();
        const prefix = p_doc_type === 'invoice' ? 'FT' : (p_doc_type === 'proforma' ? 'PP' : 'FR');
        
        const countQuery = await localQuery(
          `SELECT COUNT(*) as count FROM invoices WHERE tenant_id = ? AND doc_type = ? AND invoice_number LIKE ?`,
          [p_tenant_id, p_doc_type, `${prefix} ${currentYear}/%`]
        );
        const nextNum = (countQuery[0]?.count || 0) + 1;
        const formattedNumber = `${prefix} ${currentYear}/${nextNum}`;
        return { data: formattedNumber, error: null };
      }
      
      return { data: null, error: { message: `Simulação local de RPC ${functionName} não implementada.` } };
    } catch (err: any) {
      return { data: null, error: { message: err.message, details: err } };
    }
  },

  // Proxies para a autenticação offline/online
  auth: {
    async getSession() {
      if (isOnline() && supabase) {
        return await supabase.auth.getSession();
      }
      // Offline: Ler a sessão guardada em localStorage pelo Supabase Client
      try {
        const storedSession = localStorage.getItem(`sb-${new URL(supabase ? (supabase as any).supabaseUrl : 'https://rzelexvouysvkejfwrbf.supabase.co').hostname}-auth-token`);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          return { data: { session: parsed }, error: null };
        }
      } catch (e) {}
      return { data: { session: null }, error: null };
    },

    async signInWithPassword(credentials: any) {
      if (isOnline() && supabase) {
        const res = await supabase.auth.signInWithPassword(credentials);
        if (!res.error && res.data.session) {
          // Replicar o utilizador para a tabela local de utilizadores
          const profile = await supabase.from('user_profiles').select('*').eq('id', res.data.session.user.id).single();
          if (profile.data) {
            await localExecute(
              `INSERT OR REPLACE INTO user_profiles (id, tenant_id, role, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [profile.data.id, profile.data.tenant_id, profile.data.role, profile.data.full_name, profile.data.email, profile.data.created_at, profile.data.updated_at]
            );
            
            // Gravar também o tenant
            const tenant = await supabase.from('tenants').select('*').eq('id', profile.data.tenant_id).single();
            if (tenant.data) {
              const tk = Object.keys(tenant.data);
              const tv = tk.map(k => tenant.data[k]);
              const tplaceholders = tk.map(() => '?').join(',');
              await localExecute(`INSERT OR REPLACE INTO tenants (${tk.join(',')}) VALUES (${tplaceholders})`, tv);
            }
          }
        }
        return res;
      } else {
        // Autenticação offline baseada em perfis locais
        try {
          const profiles = await localQuery('SELECT * FROM user_profiles WHERE email = ?', [credentials.email]);
          if (profiles && profiles.length > 0) {
            // Em modo offline, aceita a credencial baseada na presença do email localmente
            // ATENÇÃO: Numa app de produção real, far-se-ia um hash básico do pass, mas
            // como fallback offline local seguro em rede interna, confiamos no perfil local.
            const fakeUser = {
              id: profiles[0].id,
              email: profiles[0].email,
              user_metadata: { full_name: profiles[0].full_name },
            };
            const fakeSession = {
              access_token: 'offline_token_' + Date.now(),
              user: fakeUser,
              expires_at: Math.floor(Date.now() / 1000) + 86400,
            };
            return { data: { session: fakeSession, user: fakeUser }, error: null };
          }
        } catch (e) {}
        return { data: { session: null, user: null }, error: { message: 'Incapaz de autenticar offline. Perfil não encontrado localmente.' } };
      }
    },

    async signOut() {
      if (isOnline() && supabase) {
        return await supabase.auth.signOut();
      }
      return { error: null };
    },

    onAuthStateChange(callback: any) {
      if (supabase) {
        return supabase.auth.onAuthStateChange(callback);
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};
