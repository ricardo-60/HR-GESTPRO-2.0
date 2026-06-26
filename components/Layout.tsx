
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../AuthContext';
import PWAInstallBanner from './PWAInstallBanner';
import SupportButton from './SupportButton';
import { SyncStatusBar } from './SyncStatusBar';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const { user, profile } = useAuth();

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hr_gestpro_theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hr_gestpro_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Auto-collapse sidebar on smaller screens
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">
      {/* Mobile Overlay */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        currentPath={currentPath}
        onNavigate={(path) => {
          onNavigate(path);
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 transition-colors duration-300">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="text-gray-400 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors p-2"
          >
            <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-outdent'} text-lg`}></i>
          </button>

          <div className="flex items-center space-x-6">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-all border border-gray-200/50 dark:border-slate-700 shadow-sm"
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              <i className={`fas ${theme === 'dark' ? 'fa-sun text-amber-500' : 'fa-moon text-indigo-500'} text-base animate-in fade-in zoom-in duration-300`}></i>
            </button>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100 leading-none">{profile?.full_name || user?.email}</p>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter mt-1">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-750 flex items-center justify-center text-gray-500 dark:text-slate-400 font-bold overflow-hidden">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-gray-50/55 dark:bg-slate-950/20 relative transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
          <PWAInstallBanner />
          <SupportButton />
        </main>

        <SyncStatusBar />
      </div>
    </div>
  );
};

export default Layout;
