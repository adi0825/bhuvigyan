import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import { stateApi } from '../../api/state';
import { useAuth } from '../../auth/AuthContext';

export default function StateLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter credentials');
      return;
    }
    setLoading(true);
    try {
      const response = await stateApi.login(email, password, '123456');
      const data = (response as any).data?.data || (response as any).data;
      if (data?.accessToken) login(data.accessToken, data.refreshToken);
      toast.success('Login successful!');
      window.location.href = '/state/dashboard';
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.detail || error.response?.data?.message || 'Login failed. Use Admin login for DC access.';
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
            <div className="w-16 h-16 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-[#d97706]" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">State Head / DC Portal</h1>
            <p className="text-[#6b7280] text-[14px]">Enter your state credentials</p>
          </div>

          <GovCard className="p-8">
            <div className="space-y-6">
              <GovInput label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="statehead.ka@bhuvigyan.gov.in" />
              <div className="relative">
                <GovInput label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[36px] text-[#9ca3af] hover:text-primary">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <GovButton fullWidth size="lg" onClick={handleLogin} loading={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Login</span><ArrowRight size={18} /></>}
              </GovButton>
              <div className="text-center space-y-1">
                <p className="text-[12px] text-[#9ca3af]">Demo: dc.bagalkot@bhuvigyan.gov.in / Admin@123</p>
                <p className="text-[11px] text-[#d97706] font-bold">TOTP: 123456</p>
              </div>
            </div>
          </GovCard>
        </motion.div>
      </main>
      <GovFooter />
    </div>
  );
}
