import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthContext';
import { farmerApi } from '../../api/farmer';
import { adminApi } from '../../api/admin';
import { cscApi } from '../../api/csc';
import { insurerApi } from '../../api/insurer';
import api from '../../api/axios';
import GovCard from '../ui/GovCard';
import GovButton from '../ui/GovButton';

const demoRoles = [
  {
    label: 'Farmer (9900000001)',
    role: 'FARMER',
    action: async () => {
      const loginRes = await farmerApi.login('9900000001');
      return farmerApi.verifyOtp('9900000001', loginRes.data?.devOtp || '123456');
    },
    redirect: '/farmer/dashboard',
    color: 'green',
  },
  {
    label: 'Super Admin',
    role: 'SUPER_ADMIN',
    action: async () => {
      return adminApi.login('superadmin@bhuvigyan.gov.in', 'Admin@123', '123456');
    },
    redirect: '/admin/dashboard',
    color: 'blue',
  },
  {
    label: 'Karnataka State Head',
    role: 'STATE_HEAD',
    action: async () => {
      return adminApi.login('statehead.ka@bhuvigyan.gov.in', 'Admin@123', '123456');
    },
    redirect: '/admin/dashboard',
    color: 'green',
  },
  {
    label: 'District Collector (DC)',
    role: 'DC',
    action: async () => {
      return adminApi.login('dc.bagalkot@bhuvigyan.gov.in', 'Admin@123', '123456');
    },
    redirect: '/state/dashboard',
    color: 'amber',
  },
  {
    label: 'CSC Operator (CSC-KA-001)',
    role: 'CSC_OPERATOR',
    action: async () => {
      return cscApi.login('CSC-KA-001', 'Csc@123', '123456');
    },
    redirect: '/csc/dashboard',
    color: 'orange',
  },
  {
    label: 'Field Inspector',
    role: 'FIELD_INSPECTOR',
    action: async () => {
      return adminApi.login('inspector1@bhuvigyan.gov.in', 'Admin@123', '123456');
    },
    redirect: '/field/dashboard',
    color: 'blue',
  },
  {
    label: 'Insurer (NICL)',
    role: 'INSURER',
    action: async () => {
      return insurerApi.login('NICL', 'insurer123');
    },
    redirect: '/insurer/dashboard',
    color: 'green',
  },
  {
    label: 'District Officer',
    role: 'DISTRICT_OFFICER',
    action: async () => {
      return adminApi.login('officer.bagalkot@bhuvigyan.gov.in', 'Admin@123', '123456');
    },
    redirect: '/admin/dashboard',
    color: 'blue',
  },
];

export default function DemoRoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { login } = useAuth();

  const handleRoleSwitch = async (role: (typeof demoRoles)[0]) => {
    setLoading(role.label);
    try {
      const res = await role.action();
      const data = res.data?.data || res.data;
      const token = data.accessToken || data.token;
      const refresh = data.refreshToken || data.refresh_token || '';
      if (token) {
        login(token, refresh);
        toast.success(`Switched to ${role.label}`);
        window.location.href = role.redirect;
      } else {
        throw new Error('No token in response');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.error?.message || 'Login failed. Services may not be running.';
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  const colorMap: Record<string, string> = {
    green: 'text-[#16a34a] border-[#d1fae5]',
    blue: 'text-[#0057a8] border-[#dbeafe]',
    amber: 'text-[#d97706] border-[#fef3c7]',
    orange: 'text-[#ea580c] border-[#ffedd5]',
    red: 'text-[#dc2626] border-[#fee2e2]',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="mb-3"
          >
            <GovCard topBorder="green" className="p-4 w-72 shadow-[0_10px_40px_rgba(0,0,0,0.15)] bg-white">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#f3f4f6]">
                <span className="text-[14px] font-black text-primary">Demo Mode</span>
                <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full font-bold">DEV ONLY</span>
              </div>
              <p className="text-[11px] text-[#9ca3af] mb-3">One-click login — no password needed</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {demoRoles.map((role) => (
                  <GovButton
                    key={role.label}
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleRoleSwitch(role)}
                    loading={loading === role.label}
                    className={`justify-start font-bold text-[13px] border ${colorMap[role.color]}`}
                  >
                    {role.label}
                  </GovButton>
                ))}
              </div>
            </GovCard>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 px-6 rounded-full bg-white border border-[#e5e7eb] shadow-lg flex items-center gap-3 text-primary font-bold hover:bg-[#f0fdf4] transition-all hover:-translate-y-0.5"
      >
        <Bug size={20} className={isOpen ? 'text-danger' : 'text-primary'} />
        <span>Demo</span>
      </button>
    </div>
  );
}
