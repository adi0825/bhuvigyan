import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, AlertTriangle,
  ClipboardList, BarChart3, History, LogOut, Bell,
  Satellite, FolderOpen, Boxes, SlidersHorizontal,
  ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export default function AdminSidebar({ collapsed, setCollapsed }: AdminSidebarProps) {
  const { logout, user } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Farmer Registry', path: '/admin/farmers' },
    { icon: FileText, label: 'Claims', path: '/admin/claims' },
    { icon: AlertTriangle, label: 'Fraud Detection', path: '/admin/fraud' },
    { icon: ClipboardList, label: 'Assign Visits', path: '/admin/assign-visits' },
    { icon: Satellite, label: 'Satellite Analytics', path: '/admin/satellite-v7' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: Boxes, label: 'User Management', path: '/admin/users' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: History, label: 'Audit Trail', path: '/admin/audit-log' },
    { icon: Shield, label: 'Inspector Management', path: '/admin/inspectors' },
  ];

  return (
    <aside 
      className={`bg-white border-r border-[#e5e7eb] shadow-[2px_0_8px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col z-50 sticky top-10 h-[calc(100vh-40px)] ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b border-[#f3f4f6]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/images/bhuvigyan-logo.svg" alt="L" className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="font-bold text-[#1a6b3c] text-sm leading-none">Bhuvigyan</span>
              <span className="text-[10px] text-[#6b7280] font-medium tracking-tight mt-0.5">ADMIN PORTAL</span>
            </div>
          </div>
        )}
        {collapsed && <img src="/images/bhuvigyan-logo.svg" alt="L" className="w-8 h-8 mx-auto" />}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-primary transition-colors absolute -right-3 top-5 bg-white border border-[#e5e7eb] shadow-sm"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
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
                {!collapsed && <span className="text-[14px] truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#f3f4f6] bg-[#f9fafb]">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[13px] font-bold text-[#1a1a1a] truncate">{user?.fullName || 'Super Admin'}</span>
              <span className="badge badge-approved text-[9px] py-0.5 px-1.5 w-fit">SUPER_ADMIN</span>
            </div>
          </div>
        )}
        <button 
          onClick={logout}
          className={`flex items-center gap-3 w-full py-2 px-3 text-[#c0392b] hover:bg-[#fee2e2] rounded-lg transition-colors font-semibold text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
