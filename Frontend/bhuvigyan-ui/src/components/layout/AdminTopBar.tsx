import { useState } from 'react';
import { 
  Bell, 
  Search, 
  HelpCircle, 
  User, 
  ChevronDown, 
  Menu,
  ShieldCheck,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminTopBarProps {
  onMenuClick: () => void;
}

export default function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  const { user, logout } = useAuth();
  const { services, isLoading } = useServiceHealth();
  const [profileOpen, setProfileOpen] = useState(false);

  const overallStatus = services.every(s => s.status === 'UP') ? 'UP' : 'DEGRADED';

  return (
    <header className="h-[70px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors lg:hidden"
        >
          <Menu size={20} className="text-[#64748b]" />
        </button>
        
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-[#f8fafc] border border-[#e5e7eb] rounded-full">
          <span className={`dot-pulse ${overallStatus === 'UP' ? 'dot-green' : 'dot-red'}`} />
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
            {overallStatus === 'UP' ? 'All Systems Operational' : 'Systems Degraded'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex relative group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="h-10 pl-10 pr-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-xl text-[13px] w-[240px] focus:w-[320px] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="h-8 w-px bg-[#e5e7eb] mx-2 hidden md:block" />

        <button className="p-2.5 text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger rounded-full border-2 border-white" />
        </button>

        <button className="p-2.5 text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors">
          <HelpCircle size={20} />
        </button>

        <div className="relative">
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 p-1.5 hover:bg-[#f1f5f9] rounded-xl transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white shadow-sm">
              <User size={20} />
            </div>
            <div className="hidden lg:block text-left mr-1">
              <p className="text-[13px] font-bold text-[#1a1a1a] leading-none mb-1">{user?.fullName || 'Admin User'}</p>
              <p className="text-[11px] text-[#94a3b8] font-bold uppercase tracking-wider">Super Admin</p>
            </div>
            <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-[220px] bg-white rounded-2xl border border-[#e5e7eb] shadow-xl z-50 p-2"
                >
                  <div className="p-3 border-b border-[#f1f5f9] mb-1">
                    <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1">Account</p>
                    <p className="text-[13px] text-[#1a1a1a] truncate font-medium">{user?.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#475569] font-medium hover:bg-[#f8fafc] rounded-lg transition-colors">
                    <ShieldCheck size={18} />
                    Security Logs
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#475569] font-medium hover:bg-[#f8fafc] rounded-lg transition-colors">
                    <Settings size={18} />
                    System Settings
                  </button>
                  <div className="h-px bg-[#f1f5f9] my-1" />
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-danger font-bold hover:bg-[#fef2f2] rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
