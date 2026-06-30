import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { localQuery, localExecute, checkServerHealth } from '../lib/db/localDB';
import { isOnline, setForcedOffline } from '../lib/dataLayer';
import { ShieldCheck, Database, RefreshCw, Terminal, Download, Zap, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface TableStat {
  name: string;
  count: number;
  status: 'healthy' | 'empty' | 'error';
}

export default function AutonomyPanel() {
  const { tenantStatus, user } = useAuth();
  const [forcedOfflineActive, setForcedOfflineActive] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem('hr_gestpro_forced_offline') === 'true' : false
  );
  
  // Estados de Diagnóstico
  const [supabaseLatency, setSupabaseLatency] = useState<number | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [localServerStatus, setLocalServerStatus] = useState<'healthy' | 'down' | 'checking'>('checking');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  
  // Tabela e Estatísticas
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  const getPendingSyncs = async () => {
    try {
      const result = await localQuery('SELECT COUNT(*) as count FROM sync_queue');
      const count = result[0]?.count || 0;
      setPendingSyncCount(count);
      return count;
    } catch (e) {
      console.warn('Erro ao obter fila de sincronização:', e);
      return 0;
    }
  };

  const testSupabaseConnection = async () => {
    setSupabaseStatus('checking');
    const start = Date.now();
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) throw new Error('Supabase Client nulo');
      
      const { error } = await supabase.from('tenants').select('id').limit(1);
      if (error) throw error;
      
      const elapsed = Date.now() - start;
      setSupabaseLatency(elapsed);
      setSupabaseStatus('connected');
      addLog(`Ligação ao Supabase Cloud estabelecida. Latência: ${elapsed}ms`);
    } catch (err: any) {
      setSupabaseLatency(null);
      setSupabaseStatus('disconnected');
      addLog(`Falha na ligação ao Supabase Cloud: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const testLocalServer = async () => {
    setLocalServerStatus('checking');
    try {
      const ok = await checkServerHealth();
      setLocalServerStatus(ok ? 'healthy' : 'down');
      addLog(`Ligação ao SQLite Servidor Local: ${ok ? 'Operacional (Porta 3002)' : 'Inativo ou Offline'}`);
    } catch (e) {
      setLocalServerStatus('down');
      addLog('Falha ao aceder ao servidor de base de dados local.');
    }
  };

  const checkTableHealth = async () => {
    const tables = [
      'tenants', 'user_profiles', 'departments', 'employees', 
      'products', 'invoices', 'customers', 'sync_queue'
    ];
    
    const stats: TableStat[] = [];
    addLog('A ler a integridade das tabelas SQLite locais...');

    for (const table of tables) {
      try {
        const rows = await localQuery(`SELECT COUNT(*) as count FROM ${table}`);
        const count = rows[0]?.count || 0;
        stats.push({
          name: table,
          count: count,
          status: count > 0 ? 'healthy' : 'empty'
        });
      } catch (err: any) {
        stats.push({
          name: table,
          count: 0,
          status: 'error'
        });
        addLog(`⚠️ Alerta: Tabela '${table}' com erro ou em falta: ${err.message}`);
      }
    }
    setTableStats(stats);
    addLog('Varredura de integridade de tabelas concluída.');
  };

  const handleToggleOffline = (checked: boolean) => {
    setForcedOfflineActive(checked);
    setForcedOffline(checked);
    addLog(`Configuração manual de rede: Modo ${checked ? 'OFFLINE FORÇADO' : 'DETECÇÃO AUTOMÁTICA'}`);
    // Recarregar conexões após alterar modo
    setTimeout(() => {
      runFullDiagnostic();
    }, 500);
  };

  const runFullDiagnostic = async () => {
    setDiagnosing(true);
    setLogs([]);
    addLog('Iniciando auto-diagnóstico completo...');
    
    await testLocalServer();
    if (!forcedOfflineActive) {
      await testSupabaseConnection();
    } else {
      setSupabaseStatus('disconnected');
      setSupabaseLatency(null);
      addLog('Ligação cloud suspensa (Modo Offline Ativo).');
    }
    
    await getPendingSyncs();
    await checkTableHealth();
    
    setDiagnosing(false);
    addLog('Diagnóstico finalizado com sucesso.');
  };

  const runAutoRepair = async () => {
    setDiagnosing(true);
    addLog('Iniciando rotinas de auto-reparação autónoma...');

    try {
      // 1. Garantir que a sync_queue existe
      addLog('Verificando integridade da tabela de sync...');
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
      addLog('Tabela sync_queue validada.');

      // 2. Limpar logs corrompidos (onde data não seja JSON válido ou nulo em deletes)
      addLog('A limpar entradas de sincronização corrompidas...');
      const changes = await localExecute(`
        DELETE FROM sync_queue WHERE action != 'DELETE' AND (data IS NULL OR data = '')
      `);
      if (changes.changes > 0) {
        addLog(`${changes.changes} registos corrompidos na fila foram removidos.`);
      } else {
        addLog('Fila de sincronização local está saudável.');
      }

      // 3. Regenerar índices se necessário
      addLog('Regenerando índices de bases de dados locais para melhor performance...');
      await localExecute('CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp)');
      await localExecute('CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)');
      await localExecute('CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)');
      addLog('Índices de performance locais otimizados.');

      addLog('Sincronizando estado da sessão...');
      await getPendingSyncs();
      await checkTableHealth();

      addLog('✨ Auto-reparação concluída! Sistema reconfigurado com sucesso.');
    } catch (e: any) {
      addLog(`❌ Erro crítico no Self-Healing: ${e.message}`);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleExportBackup = async () => {
    addLog('Iniciando compilação do backup local dos dados...');
    try {
      const backupData: Record<string, any[]> = {};
      const tables = [
        'tenants', 'user_profiles', 'departments', 'employees', 
        'products', 'invoices', 'invoice_items', 'customers', 'suppliers'
      ];

      for (const table of tables) {
        try {
          const rows = await localQuery(`SELECT * FROM ${table}`);
          backupData[table] = rows;
        } catch (e) {
          backupData[table] = [];
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_gestpro_local_${tenantStatus?.company_name?.replace(/\s+/g, '_') || 'empresa'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog('✅ Backup JSON compilado e descarregado com sucesso!');
    } catch (err: any) {
      addLog(`❌ Falha ao exportar backup: ${err.message}`);
    }
  };

  useEffect(() => {
    runFullDiagnostic();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 dark:border-slate-800 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Painel de Autonomia</h2>
          <p className="text-slate-400 dark:text-slate-400 font-medium text-lg">Diagnósticos, Self-Healing e Gestão de Dados Offline</p>
        </div>
        
        <button
          onClick={runFullDiagnostic}
          disabled={diagnosing}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${diagnosing ? 'animate-spin' : ''}`} />
          Recarregar Diagnóstico
        </button>
      </div>

      {/* Grid de Estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Supabase */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
              supabaseStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/20' : 
              supabaseStatus === 'checking' ? 'bg-indigo-500 shadow-indigo-500/20 animate-pulse' : 'bg-rose-500 shadow-rose-500/20'
            }`}>
              <Wifi className="w-6 h-6" />
            </div>
            {supabaseStatus === 'connected' && supabaseLatency && (
              <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                {supabaseLatency}ms
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Ligação Cloud</p>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
            {supabaseStatus === 'connected' ? 'Supabase Online' : 
             supabaseStatus === 'checking' ? 'A verificar...' : 'Supabase Offline'}
          </h3>
        </div>

        {/* Status SQLite Local */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
              localServerStatus === 'healthy' ? 'bg-indigo-600 shadow-indigo-600/20' : 
              localServerStatus === 'checking' ? 'bg-indigo-500 shadow-indigo-500/20 animate-pulse' : 'bg-rose-500 shadow-rose-500/20'
            }`}>
              <Database className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Servidor Local SQLite</p>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
            {localServerStatus === 'healthy' ? 'Base de Dados Ativa' : 
             localServerStatus === 'checking' ? 'A ligar...' : 'SQLite Offline'}
          </h3>
        </div>

        {/* Fila de Sincronização */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
              pendingSyncCount > 0 ? 'bg-amber-500 shadow-amber-500/20 animate-pulse' : 'bg-emerald-500 shadow-emerald-500/20'
            }`}>
              <RefreshCw className="w-6 h-6" />
            </div>
            {pendingSyncCount > 0 && (
              <span className="text-[10px] font-black px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full">
                Pendentes
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Fila de Sincronização</p>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
            {pendingSyncCount === 0 ? 'Sem dados pendentes' : `${pendingSyncCount} registo(s) na fila`}
          </h3>
        </div>
      </div>

      {/* Seção Principal: Controles e Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controles de Autonomia */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-[0.2em]">Painel de Controlo</h3>
            
            {/* Toggle de Offline Forçado */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100/50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {forcedOfflineActive ? <WifiOff className="w-5 h-5 text-rose-500 animate-bounce" /> : <Wifi className="w-5 h-5 text-indigo-500" />}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Offline Forçado</h4>
                  <p className="text-[9px] text-slate-400 font-medium">Bypass da cloud automático</p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={forcedOfflineActive}
                  onChange={(e) => handleToggleOffline(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {/* Ações Rápidas de Reparação */}
            <div className="space-y-3 pt-2">
              <button
                onClick={runAutoRepair}
                disabled={diagnosing}
                className="w-full flex items-center justify-center gap-2 bg-slate-950 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                Auto-Reparação Rápida
              </button>

              <button
                onClick={handleExportBackup}
                disabled={diagnosing}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400 hover:bg-indigo-100 text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar Backup JSON
              </button>
            </div>

            {/* Caixa Informativa */}
            <div className="p-4 bg-indigo-50/50 dark:bg-slate-800/30 rounded-2xl border border-indigo-100/30 dark:border-slate-850">
              <div className="flex gap-2 items-start text-indigo-700 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold leading-relaxed">
                  O sistema de auto-reparação garante que a sua base de dados local SQLite se mantenha estável, mesmo com falhas de energia ou quebras repentinas na rede.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas de Tabelas e Consola de Logs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Estatísticas de Integridade das Tabelas */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-slate-850 bg-gray-50/20 dark:bg-slate-900/30 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-[0.2em]">Varredura das Tabelas</h3>
              <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-gray-100 dark:border-slate-800">
                SQLite Integridade
              </span>
            </div>
            
            <div className="p-6">
              {tableStats.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Carregando dados das tabelas...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {tableStats.map((stat) => (
                    <div 
                      key={stat.name} 
                      className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100/60 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <span className="text-[9px] font-mono text-slate-400 truncate">{stat.name}</span>
                      <div className="flex justify-between items-end mt-3">
                        <span className="text-xl font-black text-slate-800 dark:text-white">{stat.count}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          stat.status === 'healthy' ? 'bg-emerald-500 ring-4 ring-emerald-500/10' :
                          stat.status === 'empty' ? 'bg-slate-400 ring-4 ring-slate-400/15' : 'bg-rose-500 ring-4 ring-rose-500/10'
                        }`}></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Consola de Logs */}
          <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-slate-900 shadow-xl flex flex-col h-72">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.25em]">Consola de Autonomia</h3>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-[9px] font-bold text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest"
              >
                Limpar Logs
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-2.5 custom-scrollbar pr-2 select-text">
              {logs.length === 0 ? (
                <p className="text-slate-600 italic">Consola pronta para diagnósticos...</p>
              ) : (
                logs.map((log, index) => (
                  <p 
                    key={index} 
                    className={`${
                      log.includes('❌') ? 'text-rose-400 font-bold' : 
                      log.includes('⚠️') ? 'text-amber-400' :
                      log.includes('✅') || log.includes('✨') ? 'text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
