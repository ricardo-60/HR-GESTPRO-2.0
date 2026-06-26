import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import LicenseActivationModal from '../components/LicenseActivationModal';
import { ShieldAlert, KeyRound, Timer, Download, Activity, Lock } from 'lucide-react';
import { downloadProformaPDF } from '../lib/ProformaGenerator';
import { dataLayer as supabase } from '../lib/dataLayer';
import { OnboardingTour } from '../components/OnboardingTour';

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string; trend?: string }> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 ${color || 'bg-slate-400'} rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-current/10`}>
        <i className={`fas ${icon || 'fa-info-circle'}`}></i>
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full tracking-tighter ${
          trend.startsWith('+') 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-2">{title}</p>
    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
  </div>
);

interface DashboardProps {
  variant: 'master' | 'admin' | 'rh' | 'finance';
}

const Dashboard: React.FC<DashboardProps> = ({ variant }) => {
  const { tenantStatus, user, signOut } = useAuth();
  const [showActivation, setShowActivation] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    const shown = localStorage.getItem(`hgp_onboarding_shown_${user?.id}`);
    if (!shown && tenantStatus?.status === 'trial') {
      setShowOnboarding(true);
    }
  }, [user, tenantStatus]);

  const handleCloseOnboarding = () => {
    localStorage.setItem(`hgp_onboarding_shown_${user?.id}`, 'true');
    setShowOnboarding(false);
  };

  // Cálculo de dias para expiração
  const expiryDate = tenantStatus?.license_expires_at || tenantStatus?.trial_end_date;
  const daysRemaining = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
    : 0;

  const handleDownloadInvoice = async () => {
    if (!tenantStatus?.tenant_id) return;

    // Buscar IBAN global
    const { data: sData, error: sError } = await (supabase?.from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'global_iban')
      .maybeSingle() || { data: null, error: null });

    if (sError) console.warn('Falha ao buscar IBAN global:', sError);

    downloadProformaPDF({
      invoiceRef: `PRF-${new Date().getFullYear()}-${tenantStatus.tenant_id.substring(0, 6).toUpperCase()}`,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      clientName: tenantStatus.company_name,
      planType: tenantStatus.plan_type || 'Business',
      durationDays: 365,
      amountAOA: 150000,
      globalIban: sData?.setting_value,
      newExpiresAt: new Date(Date.now() + 372 * 86400000).toISOString()
    });
  };

  const getDashboardData = () => {
    switch (variant) {
      case 'master':
        return {
          title: 'Master Console',
          subtitle: 'Global SaaS Ecosystem Overview',
          stats: [
            { title: 'Total Tenants', value: '1,248', icon: 'fa-building', color: 'bg-slate-900', trend: '+12%' },
            { title: 'API Uptime', value: '99.99%', icon: 'fa-microchip', color: 'bg-indigo-600' },
            { title: 'Annual Recurring', value: '2.4M KZ', icon: 'fa-chart-line', color: 'bg-purple-600', trend: '+18%' },
            { title: 'System Health', value: 'Optimal', icon: 'fa-heartbeat', color: 'bg-emerald-500' }
          ]
        };
      case 'rh':
        return {
          title: 'Recursos Humanos',
          subtitle: `Gestão de Equipa: ${tenantStatus?.company_name || 'Organização'}`,
          stats: [
            { title: 'Colaboradores', value: '142', icon: 'fa-users', color: 'bg-blue-600' },
            { title: 'Taxa de Presenças', value: '94.2%', icon: 'fa-user-clock', color: 'bg-cyan-500', trend: '-2%' },
            { title: 'Vagas Abertas', value: '8', icon: 'fa-briefcase', color: 'bg-violet-500' },
            { title: 'Docs Pendentes', value: '14', icon: 'fa-file-signature', color: 'bg-rose-500' }
          ]
        };
      case 'finance':
        return {
          title: 'Financeiro & Compras',
          subtitle: `Entidade: ${tenantStatus?.company_name || 'Organização'}`,
          stats: [
            { title: 'Vendas (Mês)', value: '84.500 KZ', icon: 'fa-chart-line', color: 'bg-emerald-600', trend: '+5.4%' },
            { title: 'Contas a Pagar', value: '32.100 KZ', icon: 'fa-file-invoice-dollar', color: 'bg-rose-500', trend: '+12%' },
            { title: 'Compras (Mês)', value: '45.000 KZ', icon: 'fa-shopping-cart', color: 'bg-indigo-500' },
            { title: 'Pendente (IVA)', value: '11.250 KZ', icon: 'fa-landmark', color: 'bg-slate-700' }
          ]
        };
      default:
        return {
          title: 'Painel Admin',
          subtitle: `Gestão Corporativa: ${tenantStatus?.company_name || 'Organização'}`,
          stats: [
            { title: 'Status do Sistema', value: tenantStatus?.status === 'active' ? 'Ativo' : 'Aviso', icon: 'fa-check-circle', color: 'bg-indigo-600' },
            { title: 'Usuários Ativos', value: '12', icon: 'fa-user-shield', color: 'bg-slate-800' },
            { title: 'Alertas', value: '4', icon: 'fa-bell', color: 'bg-amber-500' },
            { title: 'Licença Atual', value: tenantStatus?.plan_type || 'Standard', icon: 'fa-crown', color: 'bg-yellow-500' }
          ]
        };
    }
  };

  const data = getDashboardData();

  if (!user || !tenantStatus) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Preparando Dashboard...</h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-2">Sincronizando ambiente organizacional</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {showOnboarding && (
        <OnboardingTour
          tenantName={tenantStatus?.company_name || 'Empresa'}
          onClose={handleCloseOnboarding}
        />
      )}
      {/* Banner de Expiração */}
      {expiryDate && daysRemaining >= 0 && daysRemaining <= 14 && (
        <div className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-[2rem] border animate-in slide-in-from-top-4 duration-500 shadow-xl ${
          daysRemaining <= 3
            ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
            : daysRemaining <= 7
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
              : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30'
          }`}>
          <div className="flex items-center gap-5 mb-4 md:mb-0">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              daysRemaining <= 3 ? 'bg-red-600 shadow-red-200' : 'bg-amber-500 shadow-amber-100'
            }`}>
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className={`font-black text-lg ${
                daysRemaining <= 3 ? 'text-red-900 dark:text-red-300' : 'text-amber-900 dark:text-amber-300'
              }`}>
                {daysRemaining <= 0 ? 'Licença Expira Hoje!' : `A sua licença expira em ${daysRemaining} dias`}
              </h3>
              <p className={`text-sm font-medium ${
                daysRemaining <= 3 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                Para evitar a interrupção dos serviços, proceda à renovação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadInvoice}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-bold text-sm transition-all"
            >
              <Download className="w-4 h-4" /> Gerar Proforma
            </button>
            <button
              onClick={() => setShowActivation(true)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-white px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                daysRemaining <= 3 ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:bg-black shadow-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Ativar Chave
            </button>
          </div>
        </div>
      )}

      {/* Modal de Ativação */}
      {showActivation && (
        <LicenseActivationModal
          tenantId={tenantStatus?.tenant_id || ''}
          onClose={() => setShowActivation(false)}
          onSuccess={() => {
            setShowActivation(false);
            window.location.reload();
          }}
        />
      )}

      {/* Título Principal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 dark:border-slate-800/80 pb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">{data.title}</h2>
          <p className="text-slate-400 dark:text-slate-400 font-medium text-lg">{data.subtitle}</p>
        </div>
        <div className="flex items-center space-x-3 bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-3 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm self-start sm:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10"></div>
          <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">
            Identidade: {user?.email?.split('@')[0] || 'Desconhecido'}
          </span>
        </div>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {(data?.stats || []).map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Layout Secundário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Tabela de Logs Operacionais */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/5 overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-slate-850 flex justify-between items-center bg-gray-50/30 dark:bg-slate-900/50">
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Logs de Atividades
            </h3>
            <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-gray-100 dark:border-slate-800">
              Live Updates
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-slate-950/30 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5">Actor</th>
                  <th className="px-8 py-5">Atividade</th>
                  <th className="px-8 py-5">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 text-sm">
                <tr className="hover:bg-indigo-50/20 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-200">System_Core</td>
                  <td className="px-8 py-6 text-slate-500 dark:text-slate-400">Backup automático executado com sucesso</td>
                  <td className="px-8 py-6 text-slate-400 dark:text-slate-500 font-mono text-xs">09:42:01</td>
                </tr>
                <tr className="hover:bg-indigo-50/20 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-200">Security_Gate</td>
                  <td className="px-8 py-6 text-slate-500 dark:text-slate-400">Novo token de sessão emitido para user_hr</td>
                  <td className="px-8 py-6 text-slate-400 dark:text-slate-500 font-mono text-xs">08:15:22</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Caixa de Segurança Glassmorphic */}
        <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-2xl border border-slate-850 dark:border-slate-900/80 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div>
            <div className="w-12 h-12 bg-white/10 dark:bg-slate-900/60 rounded-2xl flex items-center justify-center mb-8 border border-white/5">
              <Lock className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Segurança Ativa</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">A sua ligação está protegida por encriptação AES-256 e isolamento rigoroso de base de dados multi-tenant.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 dark:bg-slate-900/40 rounded-2xl border border-white/5 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Último Acesso IP</p>
              <p className="text-xs font-mono text-indigo-300">102.65.1.204 (Luanda, AO)</p>
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/50">
              Logs de Auditoria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
