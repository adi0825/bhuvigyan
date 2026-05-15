import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, FileText, FolderOpen, Leaf, Bell, Download,
  UserCircle, HelpCircle, LogOut, Phone, Menu, X, Sprout
} from 'lucide-react';
import type { FarmerProfile, LandData } from '../../types';

const navItems = [
  { path: '/farmer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/farmer/land', label: 'My Land', icon: Map },
  { path: '/farmer/application', label: 'My Application', icon: FileText },
  { path: '/farmer/documents', label: 'My Documents', icon: FolderOpen },
  { path: '/farmer/claims', label: 'My Claims', icon: FileText },
  { path: '/farmer/carbon', label: 'Carbon Credits', icon: Leaf },
  { path: '/farmer/reports', label: 'My Reports', icon: Download },
  { path: '/farmer/profile', label: 'Profile & Settings', icon: UserCircle },
  { path: '/farmer/help', label: 'Help', icon: HelpCircle },
];

interface Props {
  profile: FarmerProfile | null;
  land: LandData | null;
  unreadCount: number;
  onLogout: () => void;
}

export default function FarmerSidebar({ profile, land, unreadCount, onLogout }: Props) {
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2 bg-white rounded-lg shadow border border-gray-200"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[55]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-[260px] bg-white border-r border-[#E5E7EB] flex flex-col z-[56] transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#016B4B] rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="text-[18px] font-extrabold text-[#016B4B]">Bhuvigyan</span>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="mx-4 mb-4 p-3 bg-[#F0FAF5] rounded-xl border border-[#bbf7d0]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-[#016B4B] rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0">
              {profile?.fullName?.charAt(0) || 'F'}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#111827] truncate">{profile?.fullName || 'Farmer'}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-[#016B4B]/10 text-[#016B4B] text-[10px] font-bold uppercase rounded">Farmer</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-[#6B7280]">
              UDLRN: <span className="font-mono font-semibold text-[#111827]">{land?.udlrn || 'Loading...'}</span>
            </p>
            <p className="text-[11px] text-[#6B7280]">
              {land?.district || '--'}, {land?.state || '--'}
            </p>
            <p className="text-[11px] text-[#6B7280]">
              {land?.landAreaHa ? `${land.landAreaHa} Ha` : '--'} · {land?.season || 'Kharif 2026'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => { nav(item.path); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-[#016B4B] text-white'
                    : 'text-[#6B7280] hover:bg-[#F0FAF5] hover:text-[#016B4B]'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 pt-2 border-t border-[#E5E7EB] space-y-1">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#6B7280] hover:bg-red-50 hover:text-[#EF4444] transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#6B7280] hover:bg-[#F0FAF5] hover:text-[#016B4B] transition-colors">
            <Phone size={18} />
            <span>Contact Support</span>
          </button>
        </div>
      </aside>
    </>
  );
}
