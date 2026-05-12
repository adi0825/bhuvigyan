import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileCheck, History, User } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const navItems = [
  { to: '/inspector/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inspector/visits', icon: ClipboardList, label: 'My Visits' },
  { to: '/inspector/submit', icon: FileCheck, label: 'Submit Report' },
  { to: '/inspector/history', icon: History, label: 'History' },
  { to: '/inspector/profile', icon: User, label: 'Profile' },
];

export default function InspectorLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-green-700">Inspector Portal</h2>
          <p className="text-xs text-gray-500 mt-0.5">{user?.fullName || 'Field Inspector'}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full text-left text-sm text-red-600 hover:text-red-700"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
