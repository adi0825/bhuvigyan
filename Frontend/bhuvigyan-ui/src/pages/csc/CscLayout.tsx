import { Outlet, NavLink } from 'react-router-dom';
import { LogOut, LayoutDashboard, FilePlus, Files, AlertTriangle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const navItems = [
  { path: '/csc/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/csc/new-claim', label: 'File New Claim', icon: FilePlus },
  { path: '/csc/my-claims', label: 'My Claims', icon: Files },
  { path: '/csc/fraud-alerts', label: 'Fraud Alerts', icon: AlertTriangle },
  { path: '/csc/reports', label: 'Reports', icon: BarChart3 },
];

export default function CscLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-[#1565c0] text-white flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-[#1565c0] font-bold text-xs">CSC</span>
            </div>
            <span className="font-semibold">CSC Portal</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/20 font-medium' : 'hover:bg-white/10'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/70 mb-2">{user?.fullName || 'CSC Operator'}</div>
          <button onClick={logout} className="flex items-center gap-2 text-sm hover:text-red-200 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}