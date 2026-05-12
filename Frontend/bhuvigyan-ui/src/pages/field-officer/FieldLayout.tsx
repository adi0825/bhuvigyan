import { Outlet, NavLink } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import GovStrip from '../../components/layout/GovStrip';
import PageBackground from '../../components/layout/PageBackground';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard, ClipboardList, History, User, LogOut
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/field/dashboard' },
  { icon: ClipboardList, label: 'Assigned Visits', path: '/field/visits' },
  { icon: History, label: 'History', path: '/field/history' },
  { icon: User, label: 'Profile', path: '/field/profile' },
];

export default function FieldLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <PageBackground />
      <GovStrip />
      <Navbar />
      <div className="flex flex-1 max-w-7xl mx-auto w-full relative z-10">
        {/* Inspector Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#e5e7eb] sticky top-0 h-[calc(100vh-64px)]">
          <div className="p-4 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1a6b3c] text-white flex items-center justify-center font-bold text-sm">
                {user?.fullName?.charAt(0) || 'I'}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#1a1a1a] text-sm leading-none">{user?.fullName || 'Inspector'}</span>
                <span className="text-[10px] text-[#6b7280] font-medium tracking-tight mt-0.5">FIELD OFFICER</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 h-11 px-3 rounded-lg transition-all duration-200 group
                  ${isActive
                    ? 'bg-[#d1fae5] text-[#1a6b3c] font-bold border-l-[3px] border-[#1a6b3c] rounded-l-none shadow-sm'
                    : 'text-[#6b7280] hover:bg-[#f0fdf4] hover:text-[#1a6b3c]'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={20}
                      className={`${isActive ? 'text-[#1a6b3c]' : 'text-[#9ca3af] group-hover:text-[#1a6b3c] transition-colors'}`}
                    />
                    <span className="text-[14px] truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-[#f3f4f6] bg-[#f9fafb]">
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full py-2 px-3 text-[#c0392b] hover:bg-[#fee2e2] rounded-lg transition-colors font-semibold text-sm"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <GovFooter />
    </div>
  );
}