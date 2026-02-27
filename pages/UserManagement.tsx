
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { UserRole, UserProfile } from '../types';

const UserManagement: React.FC = () => {
  const { tenantId, user: currentUser, role: currentRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: UserRole.RH as UserRole
  });

  const fetchUsers = async () => {
    if (!tenantId || !supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .order('full_name', { ascending: true });

      // Admin Empresa only sees their tenant. Master sees all.
      if (currentRole !== UserRole.MASTER) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tenantId]);

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role
    });
    setIsModalOpen(true);
  };

  const closePortal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ email: '', full_name: '', role: UserRole.RH });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !supabase) return;
    setSubmitting(true);
    setError(null);

    try {
      if (editingUser) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.full_name,
            role: formData.role
          })
          .eq('id', editingUser.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile record
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            tenant_id: tenantId
          }]);

        if (profileError) throw profileError;
        // Note: Real invite system would trigger an edge function here
      }

      closePortal();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (profileId: string, currentStatus: boolean) => {
    if (profileId === currentUser?.id) return;
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', profileId);

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Utilizadores</h2>
          <p className="text-slate-500 text-sm font-medium">Administre os acessos e permissões da sua organização.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          <i className="fas fa-plus mr-2"></i> Adicionar Utilizador
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
            <p className="font-bold uppercase text-[10px] tracking-widest">A carregar lista...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Utilizador</th>
                  <th className="px-6 py-4">Cargo / Role</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u: any) => (
                  <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors group ${u.is_active === false ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${u.is_active === false ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          {u.full_name?.charAt(0) || u.email?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight flex items-center">
                            {u.full_name || 'Sem Nome'}
                            {u.id === currentUser?.id && <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black uppercase">Tu</span>}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${u.role === UserRole.ADMIN ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {u.role.replace('_admin', '').replace('_user', '')}
                      </span>

                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                          {u.is_active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="text-xs font-bold px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        disabled={u.id === currentUser?.id}
                        onClick={() => toggleUserStatus(u.id, u.is_active ?? true)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${u.id === currentUser?.id
                            ? 'opacity-20 cursor-not-allowed'
                            : u.is_active === false
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                      >
                        {u.is_active === false ? 'Reativar' : 'Deativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-white/20">
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
              {editingUser ? 'Editar Acesso' : 'Convidar Colaborador'}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              {editingUser ? 'Atualize as permissões deste utilizador no sistema.' : 'Um novo perfil será criado e associado à sua empresa.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
                  placeholder="Ex: João Silva"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail Profissional</label>
                <input
                  required
                  type="email"
                  disabled={!!editingUser}
                  className={`w-full px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none font-medium ${editingUser ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900 focus:ring-2 focus:ring-indigo-500'}`}
                  placeholder="joao@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Perfil de Acesso</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.RH}>RH - Gestão de Equipa</option>
                  <option value={UserRole.FINANCE}>Financeiro - Contabilidade</option>
                  <option value={UserRole.ADMIN}>Administrador de Empresa</option>
                </select>
              </div>

              {error && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                  <p className="text-rose-600 text-[10px] font-black uppercase text-center">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closePortal}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'A processar...' : editingUser ? 'Salvar Alterações' : 'Convidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
