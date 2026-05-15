import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import OtpInput from '../../components/ui/OtpInput';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import { cscApi } from '../../api/csc';
import { useAuth } from '../../auth/AuthContext';

export default function CscLogin() {
  const [cscId, setCscId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!cscId || !password) {
      toast.error('Please enter CSC ID and password');
      return;
    }

    setLoading(true);
    try {
      const response = await cscApi.login(cscId, password, '123456');
      const responseData = response.data as any;
      console.log('[CscLogin] response.data:', responseData);

      if (responseData?.success === false) {
        const msg = responseData?.error?.message || responseData?.detail || 'Invalid credentials';
        console.error('[CscLogin] Backend rejected login:', msg);
        toast.error(msg);
        return;
      }

      const payload = responseData?.data || responseData;
      const accessToken = payload?.accessToken || payload?.access_token;
      const refreshToken = payload?.refreshToken || payload?.refresh_token;

      if (!accessToken) {
        console.error('[CscLogin] No accessToken in response:', responseData);
        toast.error('Login response missing token. Check console (F12).');
        return;
      }

      login(accessToken, refreshToken || '', {
        fullName: payload?.fullName || cscId,
      });
      toast.success('Login successful!');
      setTimeout(() => {
        navigate('/csc/dashboard', { replace: true });
      }, 100);
    } catch (error: any) {
      console.error('[CscLogin] Login error:', error);
      let errorMessage = 'Login failed';
      if (!error.response) {
        errorMessage = 'Backend services not reachable. Please start Java services.';
      } else {
        errorMessage = error.response?.data?.message || error.response?.data?.error || errorMessage;
      }
      toast.error(errorMessage);
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#d1fae5] flex items-center justify-center mx-auto mb-4">
              <Building2 size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">CSC Operator Portal</h1>
            <p className="text-[#6b7280] text-[14px]">
              {step === 'login' ? 'Enter your CSC credentials' : 'Enter 2FA code'}
            </p>
          </div>

          <GovCard className="p-8">
            <div className="space-y-6">
              {step === 'login' ? (
                <>
                  <GovInput
                    label="CSC Operator ID"
                    value={cscId}
                    onChange={(e) => setCscId(e.target.value)}
                    placeholder="CSC-KA-001"
                  />
                  <div className="relative">
                    <GovInput
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[36px] text-[#9ca3af] hover:text-primary"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <GovButton fullWidth size="lg" onClick={handleLogin} loading={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Login</span><ArrowRight size={18} /></>}
                  </GovButton>
                  <div className="text-center">
                    <p className="text-[12px] text-[#9ca3af]">
                      Demo: CSC-KA-001 / Csc@123
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-[#6b7280] text-[14px]">
                    Enter the 6-digit OTP sent to your registered device
                  </p>
                  <OtpInput length={6} onComplete={() => {}} />
                </>
              )}
            </div>
          </GovCard>
        </motion.div>
      </main>
      <GovFooter />
    </div>
  );
}
