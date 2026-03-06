
import React from 'react';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';

interface NavItem {
  label: string;
  icon: string;
  roles: UserRole[];
  path: string;
  id: string;
}

export const Sidebar: React.FC<{
  isOpen: boolean;
  onNavigate: (path: string) => void;
  currentPath: string;
}> = ({ isOpen, onNavigate, currentPath }) => {
  const { role, tenantStatus, signOut } = useAuth();

  const NAV_ITEMS: NavItem[] = [
    { id: 'dash', label: 'Visão Geral', icon: 'fa-chart-pie', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.RH, UserRole.FINANCE, UserRole.SALES], path: 'dashboard' },
    { id: 'sales', label: 'Vendas', icon: 'fa-shopping-cart', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.SALES], path: 'sales' },
    { id: 'companies', label: 'Empresas', icon: 'fa-building', roles: [UserRole.MASTER, UserRole.ADMIN], path: 'companies' },
    { id: 'users', label: 'Utilizadores', icon: 'fa-user-shield', roles: [UserRole.MASTER, UserRole.ADMIN], path: 'users' },
    { id: 'rh', label: 'Recursos Humanos', icon: 'fa-users', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.RH], path: 'rh' },
    { id: 'sup', label: 'Fornecedores', icon: 'fa-truck-loading', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.FINANCE], path: 'suppliers' },
    { id: 'pur', label: 'Compras / Stock', icon: 'fa-cart-arrow-down', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.FINANCE], path: 'purchases' },
    { id: 'rep', label: 'Relatórios BI', icon: 'fa-chart-bar', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.FINANCE], path: 'reports' },
    { id: 'fin', label: 'Faturação', icon: 'fa-file-invoice-dollar', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.FINANCE], path: 'finance' },
    { id: 'saft', label: 'Exportar SAFT-AO', icon: 'fa-file-export', roles: [UserRole.MASTER, UserRole.ADMIN], path: 'saft' },
    { id: 'keys', label: 'Chaves AGT', icon: 'fa-key', roles: [UserRole.MASTER, UserRole.ADMIN], path: 'keys' },
    { id: 'cfg', label: 'Configurações', icon: 'fa-cog', roles: [UserRole.MASTER, UserRole.ADMIN], path: 'settings' },
    { id: 'help', label: 'Ajuda & Suporte', icon: 'fa-question-circle', roles: [UserRole.MASTER, UserRole.ADMIN, UserRole.RH, UserRole.FINANCE, UserRole.SALES], path: 'help' },
  ];

  const filteredItems = NAV_ITEMS.filter(item => role && item.roles.includes(role));

  return (
    <aside className={`
      ${isOpen ? 'w-64' : 'w-20'} 
      ${!isOpen && 'lg:w-20 w-0'}
      fixed lg:relative z-50
      bg-slate-900 h-full transition-all duration-300 flex flex-col border-r border-slate-800 shadow-xl overflow-hidden
    `}>
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="w-9 h-9 bg-white/5 rounded-lg p-1.5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M20 80L40 50L35 45L60 20L55 50L65 55L45 80H20Z" fill="#EA580C" />
            <path d="M10 90C30 90 70 10 90 10" stroke="#1E3A8A" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4" className="opacity-50" />
          </svg>
        </div>
        {isOpen && <h1 className="text-white font-black text-lg tracking-tighter">HR-GESTPRO <span className="text-[#EA580C]">2.0</span></h1>}
      </div>

      <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.path)}
            className={`flex items-center space-x-3 w-full p-3 rounded-xl cursor-pointer transition-all group ${currentPath === item.path
              ? 'bg-indigo-600 text-white'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
          >
            <i className={`fas ${item.icon} w-5 text-center group-hover:scale-110 transition-transform`}></i>
            {isOpen && <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
        {isOpen && (
          <div className="mb-4 px-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organização</p>
            <p className="text-xs text-indigo-400 font-bold truncate">{tenantStatus?.company_name || 'HR-GESTPRO'}</p>
          </div>
        )}
        <button
          onClick={() => {
            window.localStorage.clear();
            signOut();
            window.location.href = '/';
          }}
          className={`flex items-center space-x-3 w-full p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors ${!isOpen && 'justify-center'}`}
        >
          <i className="fas fa-sign-out-alt"></i>
          {isOpen && <span className="text-sm font-bold">Sair</span>}
        </button>
      </div>
    </aside>
  );
};
