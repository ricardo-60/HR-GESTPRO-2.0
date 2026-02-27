
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { user, profile } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-outdent'} text-lg`}></i>
          </button>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">{profile?.full_name || user?.email}</p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter mt-1">{profile?.role}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
               {user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
