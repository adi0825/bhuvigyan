import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import RootLayout from '../../components/layout/RootLayout';
import { useAuth } from '../../auth/AuthContext';

export default function CscLayout() {
  const { user, logout } = useAuth();

  return (
    <RootLayout>
      <div className="min-h-screen">
        <header className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
              <span className="text-slate-900 font-bold text-xs">CSC</span>
            </div>
            <span className="font-semibold text-white">CSC Operator Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.fullName || 'CSC-KA-001'}</span>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </RootLayout>
  );
}