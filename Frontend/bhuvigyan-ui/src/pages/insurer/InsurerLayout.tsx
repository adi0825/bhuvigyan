import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard, ClipboardList, AlertTriangle, CheckCircle, XCircle,
  Map, BarChart3, LogOut
} from 'lucide-react';

const navItems = [
  { path: '/insurer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/insurer/claims', label: 'Claims Queue', icon: ClipboardList },
  { path: '/insurer/fraud-alerts', label: 'Fraud Alerts', icon: AlertTriangle },
  { path: '/insurer/approved', label: 'Approved', icon: CheckCircle },
  { path: '/insurer/rejected', label: 'Rejected', icon: XCircle },
  { path: '/insurer/heatmap', label: 'District Heatmap', icon: Map },
  { path: '/insurer/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function InsurerLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-[#0d1b4b] text-white flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="font-bold text-lg">Insurer Portal</div>
          <div className="text-xs text-white/60 mt-1">{user?.company || 'Insurance Co.'}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#f9a825] text-[#0d1b4b] font-medium' : 'hover:bg-white/10'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/70 mb-2">{user?.fullName || 'Officer'}</div>
          <button onClick={logout} className="flex items-center gap-2 text-sm hover:text-[#f9a825] transition-colors">
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