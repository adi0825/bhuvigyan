import { User, Settings, LogOut, ChevronRight, Phone, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import PageTransition from '../../components/ui/PageTransition';

export default function FarmerProfile() {
  const { user, logout } = useAuth();

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* PROFILE HEADER */}
        <GovCard topBorder="green" className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-[#f0fdf4] border-4 border-white shadow-md flex items-center justify-center text-primary font-black text-[32px]">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'F'}
            </div>
            <div className="text-center md:text-left space-y-1">
              <h1 className="text-[24px] font-black text-[#1a1a1a]">{user?.fullName || 'Rajesh Kumar'}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                <span className="px-3 py-1 bg-[#f1f5f9] text-[#475569] text-[12px] font-bold rounded-full border border-[#e2e8f0] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary" />
                  Verified Farmer
                </span>
                <span className="px-3 py-1 bg-[#eff6ff] text-[#1e40af] text-[12px] font-bold rounded-full border border-[#dbeafe]">
                  ID: {user?.userId?.slice(0, 8) || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </GovCard>

        {/* ACCOUNT DETAILS */}
        <GovCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
            <h3 className="text-[15px] font-bold text-[#1a1a1a]">Account Details</h3>
          </div>
          <div className="p-6 space-y-0">
            <div className="flex items-center justify-between py-4 border-b border-[#f3f4f6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Mobile Number</p>
                  <p className="text-[15px] font-bold text-[#1a1a1a]">{user?.mobile || 'Not Linked'}</p>
                </div>
              </div>
              <GovButton variant="ghost" size="sm" className="text-primary font-bold">Change</GovButton>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-[#f3f4f6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Email Address</p>
                  <p className="text-[15px] font-bold text-[#1a1a1a]">{user?.email || 'Not Provided'}</p>
                </div>
              </div>
              <GovButton variant="ghost" size="sm" className="text-primary font-bold">Add Email</GovButton>
            </div>
          </div>
        </GovCard>

        {/* ACTIONS */}
        <div className="space-y-3">
          <GovButton variant="outline" fullWidth className="justify-between h-14 px-6 border-[#e5e7eb] bg-white group">
            <div className="flex items-center gap-4">
              <User size={20} className="text-[#64748b]" />
              <span className="font-bold text-[#1a1a1a]">Personal Information</span>
            </div>
            <ChevronRight size={18} className="text-[#cbd5e1] group-hover:text-primary transition-colors" />
          </GovButton>

          <GovButton variant="outline" fullWidth className="justify-between h-14 px-6 border-[#e5e7eb] bg-white group">
            <div className="flex items-center gap-4">
              <Settings size={20} className="text-[#64748b]" />
              <span className="font-bold text-[#1a1a1a]">Security & Preferences</span>
            </div>
            <ChevronRight size={18} className="text-[#cbd5e1] group-hover:text-primary transition-colors" />
          </GovButton>

          <GovButton 
            variant="danger" 
            fullWidth 
            onClick={logout}
            className="h-14 mt-8 flex items-center justify-center gap-3"
          >
            <LogOut size={20} />
            Logout Account
          </GovButton>
        </div>

        <p className="text-center text-[11px] text-[#9ca3af] font-medium pt-4">
          Bhuvigyan v6.0.4 • PMFBY Fraud Detection System
        </p>
      </div>
    </PageTransition>
  );
}