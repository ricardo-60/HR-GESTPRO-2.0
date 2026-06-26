/**
 * Driver da Base de Dados Local (SQLite)
 * Permite interagir com a base de dados local SQLite rodando no Electron
 * ou no servidor Express em rede local, de forma transparente para o Renderer.
 */

export interface DBResult {
  changes: number;
  lastInsertRowid?: number | string;
}

// Detetar se estamos a rodar dentro do Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).electronAPI !== undefined;
}

// Obter o base URL do servidor local (porta 3002)
function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    // Se no Electron em produção (protocolo file:) ou com API do Electron ativa, aponta para localhost
    if (window.location.protocol === 'file:' || (window as any).electronAPI !== undefined) {
      return 'http://localhost:3002';
    }
    // Em rede local, extrai o hostname e aponta para a porta 3002 do Express
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:3002`;
  }
  return 'http://localhost:3002';
}

/**
 * Executa uma consulta SQL (SELECT) que retorna linhas de dados.
 */
export async function localQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const start = Date.now();
  let result: T[] = [];
  if (isElectron()) {
    try {
      result = await (window as any).electronAPI.dbQuery(sql, params);
    } catch (error) {
      console.error('Erro localQuery via IPC:', error);
      throw error;
    }
  } else {
    try {
      const response = await fetch(`${getServerUrl()}/api/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      result = data.rows || [];
    } catch (error) {
      console.error('Erro localQuery via REST:', error);
      throw error;
    }
  }
  const duration = Date.now() - start;
  if (duration > 50) {
    console.warn(`[PERFORMANCE WARNING] Consulta local SQLite demorou ${duration}ms (> 50ms):`, sql);
  }
  return result;
}

/**
 * Executa uma instrução SQL (INSERT, UPDATE, DELETE) que altera o estado.
 */
export async function localExecute(sql: string, params: any[] = []): Promise<DBResult> {
  const start = Date.now();
  let result: DBResult;
  if (isElectron()) {
    try {
      result = await (window as any).electronAPI.dbExecute(sql, params);
    } catch (error) {
      console.error('Erro localExecute via IPC:', error);
      throw error;
    }
  } else {
    try {
      const response = await fetch(`${getServerUrl()}/api/db/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      result = await response.json();
    } catch (error) {
      console.error('Erro localExecute via REST:', error);
      throw error;
    }
  }
  const duration = Date.now() - start;
  if (duration > 50) {
    console.warn(`[PERFORMANCE WARNING] Execução local SQLite demorou ${duration}ms (> 50ms):`, sql);
  }
  return result;
}

/**
 * Helper para verificar o estado da ligação do servidor central
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getServerUrl()}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
