import React, { useState, useEffect } from 'react';
import { isOnline, setForcedOffline } from '../lib/dataLayer';
import { syncEngine, SyncState } from '../lib/syncEngine';

export const SyncStatusBar: React.FC = () => {
  const [online, setOnline] = useState(isOnline());
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingOps, setPendingOps] = useState(0);

  useEffect(() => {
    const handleStatusChange = () => {
      setOnline(isOnline());
    };

    window.addEventListener('connection-status-change', handleStatusChange);
    window.addEventListener('sync-status-change', handleStatusChange);

    const unsubscribe = syncEngine.subscribe((state, pending) => {
      setSyncState(state);
      setPendingOps(pending);
    });

    return () => {
      window.removeEventListener('connection-status-change', handleStatusChange);
      window.removeEventListener('sync-status-change', handleStatusChange);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    if (!online) return;
    try {
      await syncEngine.startSync();
    } catch (e) {
      console.error('Sincronização manual falhou:', e);
    }
  };

  const toggleForceOffline = () => {
    // Alterna o modo offline forçado para testes ou preferência do utilizador
    const nextVal = !isOnline();
    setForcedOffline(!isOnline());
  };

  return (
    <div className={`px-4 py-2 border-t text-xs font-semibold flex items-center justify-between transition-all duration-300 ${
      online ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-rose-950 border-rose-900 text-rose-200'
    }`}>
      <div className="flex items-center space-x-3">
        {/* Status de Conexão */}
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span>
            {online ? 'Servidor Central: Conectado (Nuvem/Rede)' : 'Servidor Central: Desconectado (Modo Local)'}
          </span>
        </div>

        {/* Botão de simulação/modo */}
        <button 
          onClick={toggleForceOffline}
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider transition-colors ${
            online ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-rose-900 hover:bg-rose-800 text-rose-100'
          }`}
        >
          {online ? 'Trabalhar Offline' : 'Tentar Conectar'}
        </button>
      </div>

      {/* Status da Sincronização */}
      <div className="flex items-center space-x-3">
        {pendingOps > 0 ? (
          <div className="flex items-center space-x-2">
            <span>{pendingOps} {pendingOps === 1 ? 'alteração pendente' : 'alterações pendentes'}</span>
            {online && (
              <button
                onClick={handleManualSync}
                disabled={syncState === 'syncing'}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] uppercase font-black tracking-widest shadow-md transition-all flex items-center space-x-1"
              >
                {syncState === 'syncing' ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    <span>Sincronizar Agora</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-slate-500">
            <i className="fas fa-check-circle text-emerald-500"></i>
            <span className={online ? 'text-slate-500' : 'text-rose-300'}>
              {syncState === 'syncing' ? 'A Sincronizar...' : 'Todos os dados locais estão atualizados'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
