import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../auth/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await adminApi.login(email, password, '123456');
      const data = response.data?.data || response.data;
      login(data.accessToken, data.refreshToken);
      toast.success('Login successful!');
      window.location.href = '/admin/dashboard';
    } catch (error: any) {
      console.error('Admin login error:', error);
      let msg: string;
      if (!error.response) {
        msg = 'Backend not reachable. Make sure server is running on port 8000.';
      } else {
        msg = error.response?.data?.error?.message || error.response?.data?.detail || error.response?.data?.message || `HTTP ${error.response.status}`;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PageBackground />
      <GovStrip />
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#dbeafe] flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-[#0057a8]" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">Admin Portal</h1>
            <p className="text-[#6b7280] text-[14px]">Enter your credentials to continue</p>
          </div>

          <GovCard className="p-8">
            <div className="space-y-6">
              <>
                <GovInput label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@bhuvigyan.gov.in" />
                <div className="relative">
                  <GovInput label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[36px] text-[#9ca3af] hover:text-primary">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="bg-[#fef3c7] border border-[#fbbf24]/30 rounded-lg p-3 text-center">
                  <p className="text-[#92400e] text-[11px] font-bold">Dev Mode: TOTP code</p>
                  <p className="text-[#d97706] font-mono text-xl font-black tracking-widest">123456</p>
                </div>
                <GovButton fullWidth size="lg" onClick={handleLogin} loading={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Login</span><ArrowRight size={18} /></>}
                </GovButton>
                <div className="text-center">
                  <p className="text-[12px] text-[#9ca3af]">Demo: superadmin@bhuvigyan.gov.in / Admin@123</p>
                </div>
              </>
            </div>
          </GovCard>
        </motion.div>
      </main>
      <GovFooter />
    </div>
  );
}
