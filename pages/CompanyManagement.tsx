
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Tenant, TenantStatus, UserRole } from '../types';

const CompanyManagement: React.FC = () => {
  const { tenantId, role: currentRole } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    tax_id: '',
    status: TenantStatus.ACTIVE,
    plan_tier: 'Pro',
    contact_email: ''
  });

  const fetchTenants = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase.from('tenants').select('*').order('company_name', { ascending: true });

      // Se não for Master, só vê a sua própria empresa
      if (currentRole !== UserRole.MASTER) {
        query = query.eq('id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTenants(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar empresas. Verifique se a tabela 'tenants' existe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [tenantId, currentRole]);

  const openModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        company_name: tenant.company_name,
        tax_id: tenant.tax_id,
        status: tenant.status,
        plan_tier: tenant.plan_tier,
        contact_email: tenant.contact_email || ''
      });
    } else {
      setEditingTenant(null);
      setFormData({
        company_name: '',
        tax_id: '',
        status: TenantStatus.ACTIVE,
        plan_tier: 'Pro',
        contact_email: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);

    try {
      if (editingTenant) {
        const { error: err } = await supabase
          .from('tenants')
          .update(formData)
          .eq('id', editingTenant.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('tenants')
          .insert([formData]);
        if (err) throw err;
      }
      setIsModalOpen(false);
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Empresas</h2>
          <p className="text-slate-500 font-medium">Controle de organizações e licenciamento do sistema.</p>
        </div>
        {currentRole === UserRole.MASTER && (
          <button 
            onClick={() => openModal()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <i className="fas fa-plus mr-2"></i> Registar Nova Empresa
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ativas</p>
          <p className="text-2xl font-black text-slate-900">{tenants.filter(t => t.status === TenantStatus.ACTIVE).length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Trial</p>
          <p className="text-2xl font-black text-indigo-600">{tenants.filter(t => t.status === TenantStatus.TRIAL).length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Licenças Expiradas</p>
          <p className="text-2xl font-black text-rose-500">{tenants.filter(t => t.status === TenantStatus.EXPIRED).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-300">
            <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
            <p className="font-bold uppercase text-[10px] tracking-widest">Sincronizando com Base de Dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Empresa / NIF</th>
                  <th className="px-8 py-5">Plano</th>
                  <th className="px-8 py-5">Estado</th>
                  <th className="px-8 py-5 text-right">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                          {t.company_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm tracking-tight">{t.company_name}</p>
                          <p className="text-xs text-slate-400 font-mono uppercase">{t.tax_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black px-3 py-1 bg-slate-900 text-white rounded-full uppercase tracking-widest">
                        {t.plan_tier}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                         <div className={`w-2 h-2 rounded-full ${
                           t.status === TenantStatus.ACTIVE ? 'bg-emerald-500' : 
                           t.status === TenantStatus.TRIAL ? 'bg-amber-500' : 'bg-rose-500'
                         }`}></div>
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => openModal(t)}
                        className="text-indigo-600 hover:text-indigo-900 font-bold text-xs uppercase tracking-widest p-2"
                      >
                        <i className="fas fa-edit mr-1"></i> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingTenant ? 'Editar Empresa' : 'Nova Organização'}
                </h3>
                <p className="text-slate-400 text-sm font-medium">Preencha os dados fiscais e operacionais.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Empresa</label>
                <input 
                  required
                  className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                  value={formData.company_name}
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Ex: Tech Solutions Lda"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIF / Tax ID</label>
                <input 
                  required
                  className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-800"
                  value={formData.tax_id}
                  onChange={e => setFormData({...formData, tax_id: e.target.value})}
                  placeholder="500 000 000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Plano</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 appearance-none"
                  value={formData.plan_tier}
                  onChange={e => setFormData({...formData, plan_tier: e.target.value})}
                >
                  <option value="Basic">Basic (5 Colabs)</option>
                  <option value="Pro">Pro (50 Colabs)</option>
                  <option value="Enterprise">Enterprise (Ilimitado)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado da Conta</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as TenantStatus})}
                >
                  <option value={TenantStatus.ACTIVE}>Ativo</option>
                  <option value={TenantStatus.TRIAL}>Período de Experiência</option>
                  <option value={TenantStatus.EXPIRED}>Suspenso / Expirado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail de Contacto</label>
                <input 
                  type="email"
                  className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                  value={formData.contact_email}
                  onChange={e => setFormData({...formData, contact_email: e.target.value})}
                  placeholder="financeiro@empresa.com"
                />
              </div>

              {error && (
                <div className="col-span-2 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <p className="text-rose-600 text-xs font-black text-center">{error}</p>
                </div>
              )}

              <div className="col-span-2 flex space-x-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  disabled={submitting}
                  className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-black transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
                >
                  {submitting ? 'A Processar...' : editingTenant ? 'Atualizar Dados' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
