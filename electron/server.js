import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar o caminho de dados do utilizador definido pelo main process
const userDataPath = process.env.USER_DATA_PATH || process.cwd();
const dbPath = path.join(userDataPath, 'gestpro_local.db');

console.log(`[LocalServer] A iniciar base de dados SQLite (node:sqlite) em: ${dbPath}`);

let db;
try {
  db = new DatabaseSync(dbPath);
  // Executar pragma
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
} catch (err) {
  console.error('[LocalServer] Falha ao abrir base de dados SQLite nativa:', err);
  process.exit(1);
}

// Inicializar as tabelas se a BD for nova
function initializeDatabase() {
  try {
    // Verificar se a tabela tenants já existe para evitar re-inicializar
    let tableExists = false;
    try {
      const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'");
      const res = stmt.all();
      if (res && res.length > 0) {
        tableExists = true;
      }
    } catch (e) {
      // Tabela não existe ou outro erro
    }

    if (!tableExists) {
      console.log('[LocalServer] Nova base de dados detetada. A carregar schema...');
      
      // Tentar localizar o ficheiro de schema SQL
      let schemaPath = path.join(__dirname, 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(__dirname, '../lib/db/schema.sql');
      }
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(process.cwd(), 'lib/db/schema.sql');
      }

      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql);
        console.log('[LocalServer] Schema SQL carregado com sucesso.');
      } else {
        console.warn('[LocalServer] Ficheiro schema.sql não localizado! Tabelas não inicializadas.');
      }
    }
  } catch (err) {
    console.error('[LocalServer] Erro na inicialização do schema local:', err);
  }
}

initializeDatabase();

const app = express();
app.use(cors());
app.use(express.json());

// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', online: true, timestamp: Date.now() });
});

// Rota de Consulta (SELECT)
app.post('/api/db/query', (req, res) => {
  const { sql, params = [] } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query em falta' });
  }

  try {
    const stmt = db.prepare(sql);
    // Usar spread operator para passar múltiplos parâmetros posicionais ao node:sqlite
    const rows = stmt.all(...params);
    res.json({ rows });
  } catch (err) {
    console.error(`[LocalServer] Erro em Query: ${sql}`, err);
    res.status(500).json({ error: err.message });
  }
});

// Rota de Execução (INSERT, UPDATE, DELETE)
app.post('/api/db/execute', (req, res) => {
  const { sql, params = [] } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL statement em falta' });
  }

  try {
    const stmt = db.prepare(sql);
    // Usar spread operator para passar múltiplos parâmetros posicionais ao node:sqlite
    const result = stmt.run(...params);
    res.json({
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    });
  } catch (err) {
    console.error(`[LocalServer] Erro em Execute: ${sql}`, err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3002;

// Iniciar escuta em todas as interfaces para permitir acessos de outras máquinas da rede
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[LocalServer] Servidor Express local escutando na porta ${PORT} em 0.0.0.0`);
});

// Graciously handle shutdown
process.on('SIGTERM', () => {
  console.log('[LocalServer] Fechando servidor local...');
  server.close(() => {
    // Nota: O DatabaseSync do node:sqlite fecha-se automaticamente quando o processo termina,
    // mas se quisermos libertar explicitamente em versões que suportam close:
    if (db && typeof db.close === 'function') {
      try { db.close(); } catch(e) {}
    }
    process.exit(0);
  });
});
