
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const { user, profile } = useAuth();

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
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Mobile Overlay */}
      {!isSidebarOpen && window.innerWidth < 1024 && (
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="text-gray-400 hover:text-indigo-600 transition-colors p-2"
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
