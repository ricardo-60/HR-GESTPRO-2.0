/**
 * Camada de Abstração de Dados Híbrida (Supabase Cloud + SQLite Local)
 * Redireciona operações de escrita e leitura de forma inteligente com base na conectividade.
 */
import { supabase } from './supabase';
import { localQuery, localExecute } from './db/localDB';
import { createPasswordHash, verifyPassword, generateOfflineSessionToken } from './authHash';

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
  private method: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
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

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.method = 'insert';
    this.writeData = data;
    return this;
  }

  upsert(data: any, options?: any) {
    this.method = 'upsert';
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
        const res = await this.executeSupabase();
        if (res.error) {
          const errMsg = res.error.message?.toLowerCase() || '';
          const isNetworkError = 
            errMsg.includes('fetch') || 
            errMsg.includes('network') || 
            errMsg.includes('failed to fetch') ||
            errMsg.includes('load failed') ||
            res.error.status === 0 ||
            res.error.status === 502 ||
            res.error.status === 503 ||
            res.error.status === 504;
          
          if (isNetworkError) {
            console.warn(`[DataLayer] Erro de rede detectado no Supabase (${res.error.message}). Fazendo fallback para SQLite local...`);
            return await this.executeLocal();
          }
        }
        return res;
      } catch (err) {
        console.warn(`[DataLayer] Supabase falhou criticamente, tentando fallback local:`, err);
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
    let cleanedSelectFields = this.selectFields;
    const relationsToFetch: Array<{ relationName: string; fields: string[] }> = [];

    // Detectar padrões como: "*, suppliers(name)" ou "products(average_cost)"
    const relationRegex = /(\w+)\(([^)]+)\)/g;
    let match;
    while ((match = relationRegex.exec(this.selectFields)) !== null) {
      const relationName = match[1];
      const fields = match[2].split(',').map(f => f.trim());
      relationsToFetch.push({ relationName, fields });
      cleanedSelectFields = cleanedSelectFields.replace(match[0], '');
    }

    // Limpar vírgulas remanescentes no início, fim ou duplicadas
    cleanedSelectFields = cleanedSelectFields
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)
      .join(', ');

    if (!cleanedSelectFields) {
      cleanedSelectFields = '*';
    }

    let sql = `SELECT ${cleanedSelectFields} FROM ${this.tableName}`;
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
    
    // Buscar dados das relações
    if (rows && rows.length > 0 && relationsToFetch.length > 0) {
      for (const row of rows) {
        for (const rel of relationsToFetch) {
          let fkName = '';
          const singularRelation = rel.relationName.endsWith('s') ? rel.relationName.slice(0, -1) : rel.relationName;
          
          if (row[`${singularRelation}_id`] !== undefined) fkName = `${singularRelation}_id`;
          else if (row[`${rel.relationName}_id`] !== undefined) fkName = `${rel.relationName}_id`;
          else if (row[`${singularRelation}Id`] !== undefined) fkName = `${singularRelation}Id`;
          
          if (fkName && row[fkName]) {
            const relSql = `SELECT ${rel.fields.join(', ')} FROM ${rel.relationName} WHERE id = ?`;
            try {
              const relRows = await localQuery(relSql, [row[fkName]]);
              row[rel.relationName] = relRows[0] || null;
            } catch (err) {
              console.warn(`[DataLayer] Falha ao buscar relação ${rel.relationName}:`, err);
              row[rel.relationName] = null;
            }
          } else {
            row[rel.relationName] = null;
          }
        }
      }
    }
    
    if (this.isSingle) {
      return { data: rows[0] || null, error: null };
    }
    return { data: rows, error: null };
  }

  private async executeLocalWrite() {
    const timestamp = Date.now();
    
    if (this.method === 'insert' || this.method === 'upsert') {
      const rows = Array.isArray(this.writeData) ? this.writeData : [this.writeData];
      const insertedRows: any[] = [];

      for (const row of rows) {
        // Assegurar ID primário se não existir
        if (!row.id) {
          row.id = crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Assegurar tenant_id caso falte
        if (!row.tenant_id) {
          try {
            const authRes = await dataLayer.auth.getSession();
            if (authRes.data?.session?.user?.id) {
              const profiles = await localQuery('SELECT tenant_id FROM user_profiles WHERE id = ?', [authRes.data.session.user.id]);
              if (profiles && profiles.length > 0 && profiles[0].tenant_id) {
                row.tenant_id = profiles[0].tenant_id;
              }
            }
          } catch(e) {}
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
    async getUser() {
      if (isOnline() && supabase) {
        return await supabase.auth.getUser();
      }
      return { data: { user: null }, error: null };
    },
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
            // Derivar e armazenar hash da password para login offline futuro
            let pwHash: string | null = null;
            let pwSalt: string | null = null;
            try {
              const hashResult = await createPasswordHash(credentials.password);
              pwHash = hashResult.hash;
              pwSalt = hashResult.salt;
              console.log('[AuthHash] Hash offline armazenado com segurança para:', credentials.email);
            } catch (hashErr) {
              console.warn('[AuthHash] Falha ao gerar hash offline (não crítico):', hashErr);
              // Não bloqueia o login se o hash falhar
            }

            // Migração: garantir colunas de hash existem (bases SQLite criadas antes da v2.2.3)
            try {
              await localExecute(`ALTER TABLE user_profiles ADD COLUMN password_hash TEXT`);
              await localExecute(`ALTER TABLE user_profiles ADD COLUMN password_salt TEXT`);
            } catch (_migrateErr) {
              // Colunas já existem — ignorar erro do ALTER TABLE
            }

            await localExecute(
              `INSERT OR REPLACE INTO user_profiles (id, tenant_id, role, full_name, email, password_hash, password_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                profile.data.id,
                profile.data.tenant_id,
                profile.data.role,
                profile.data.full_name,
                profile.data.email,
                pwHash,
                pwSalt,
                profile.data.created_at,
                profile.data.updated_at
              ]
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
        // Autenticação offline SEGURA baseada em hash PBKDF2
        try {
          const profiles = await localQuery(
            'SELECT id, full_name, email, password_hash, password_salt FROM user_profiles WHERE email = ?',
            [credentials.email]
          );
          if (profiles && profiles.length > 0) {
            const profile = profiles[0];
            
            // Se o perfil tem hash armazenado, validamos a password
            if (profile.password_hash && profile.password_salt) {
              const isValid = await verifyPassword(
                credentials.password,
                profile.password_hash,
                profile.password_salt
              );
              
              if (!isValid) {
                console.warn('[AuthHash] Tentativa de login offline falhou: password inválida para', credentials.email);
                return {
                  data: { session: null, user: null },
                  error: { message: 'Credenciais inválidas. Verifique o email e a palavra-passe.' }
                };
              }
              
              console.log('[AuthHash] Login offline validado com sucesso via hash PBKDF2 para:', credentials.email);
            } else {
              // Perfil sem hash armazenado — não é possível autenticar offline com segurança
              console.warn('[AuthHash] Perfil sem hash offline. Login offline negado para:', credentials.email);
              return {
                data: { session: null, user: null },
                error: {
                  message: 'Autenticação offline não disponível para esta conta. ' +
                    'Faça login com internet pelo menos uma vez para ativar o acesso offline.'
                }
              };
            }

            // Criar sessão offline apenas após validação bem-sucedida
            const accessToken = generateOfflineSessionToken();
            const fakeUser = {
              id: profile.id,
              email: profile.email,
              user_metadata: { full_name: profile.full_name },
            };
            const fakeSession = {
              access_token: accessToken,
              user: fakeUser,
              expires_at: Math.floor(Date.now() / 1000) + 86400, // 24h
            };
            return { data: { session: fakeSession, user: fakeUser }, error: null };
          }
        } catch (e) {
          console.error('[AuthHash] Erro crítico durante login offline:', e);
        }
        return {
          data: { session: null, user: null },
          error: { message: 'Incapaz de autenticar offline. Perfil não encontrado ou sem credenciais seguras armazenadas.' }
        };
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
  },
  get storage() {
    return supabase ? supabase.storage : ({} as any);
  }
};
