import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import OtpInput from '../../components/ui/OtpInput';
import { farmerApi } from '../../api/farmer';
import { useAuth } from '../../auth/AuthContext';
import GovStrip from '../../components/layout/GovStrip';
import PageBackground from '../../components/layout/PageBackground';
import { Link, useNavigate } from 'react-router-dom';

export default function FarmerLogin() {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await farmerApi.sendOtp(mobile);
      if (response.data && (response.data as any).data?.devOtp) {
        setDevOtp((response.data as any).data.devOtp);
      }
      setStep(2);
      setResendTimer(45);
      toast.success('OTP sent successfully');
    } catch (error: any) {
      let errorMessage = 'Failed to send OTP';
      if (!error.response) {
        errorMessage = 'Network Error: Backend services not reachable. Please run start-local.bat and wait for startup.';
      } else {
        errorMessage = error.response?.data?.error?.message || error.response?.data?.error || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (enteredOtp: string) => {
    setLoading(true);
    try {
      const response = await farmerApi.verifyOtp(mobile, enteredOtp);
      const data = (response as any).data?.data || (response as any).data;
      if (data.accessToken) {
        login(data.accessToken, data.refreshToken);
        toast.success('Login successful!');
        navigate('/farmer/dashboard', { replace: true });
      } else {
        throw new Error('No token received');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.error || 'Invalid OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    await handleSendOtp();
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <PageBackground />
      <GovStrip />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 pt-20">
        <GovCard topBorder="green" className="w-full max-w-[420px] p-0 overflow-hidden shadow-2xl">
          <div className="p-8 pb-6 text-center border-b border-[#f3f4f6]">
            <div className="flex flex-col items-center gap-3 mb-4">
              <img src="/images/bhuvigyan-logo.svg" alt="Bhuvigyan" className="w-14 h-14" />
              <div>
                <h1 className="text-[24px] font-extrabold text-[#1a1a1a] leading-none">Bhuvigyan</h1>
                <p className="text-[12px] text-[#6b7280] font-medium mt-1 uppercase tracking-wider">Pradhan Mantri Fasal Bima Yojana</p>
              </div>
            </div>
            <div className="w-12 h-1 bg-[#1a6b3c] mx-auto rounded-full mb-4" />
            <h2 className="text-[16px] font-bold text-[#1a1a1a]">Farmer Login / किसान लॉगिन</h2>
          </div>

          <div className="p-8 pt-6">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#1a1a1a]">Registered Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="h-[48px] px-3 bg-[#f0fdf4] border border-[#d1d5db] rounded-lg flex items-center justify-center font-bold text-[#1a6b3c] text-sm">
                        +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter mobile number"
                        className="gov-input h-[48px] text-lg font-semibold tracking-wider"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <GovButton
                    fullWidth
                    size="lg"
                    onClick={handleSendOtp}
                    loading={loading}
                    className="h-[52px] text-[15px]"
                  >
                    Send OTP
                  </GovButton>

                  <p className="text-center text-[13px] text-[#6b7280]">
                    New farmer? <Link to="/register" className="text-primary font-bold hover:underline">Register via CSC</Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-[#6b7280] hover:text-primary text-sm font-medium transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to enter mobile
                  </button>

                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-[#1a1a1a]">Enter OTP</h3>
                    <p className="text-[#6b7280] text-[13px]">
                      OTP sent to +91 {mobile.slice(0, 3)}XXXX{mobile.slice(-2)}
                    </p>
                  </div>

                  <OtpInput
                    length={6}
                    onComplete={(otp) => {
                      setOtp(otp);
                    }}
                  />

                  <GovButton
                    fullWidth
                    size="lg"
                    onClick={() => handleVerifyOtp(otp)}
                    loading={loading}
                    className="h-[52px] text-[15px]"
                  >
                    Verify & Login
                  </GovButton>

                  <div className="flex flex-col items-center gap-4 pt-2">
                    <button
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0}
                      className={`text-sm font-bold transition-colors ${resendTimer > 0 ? 'text-[#9ca3af]' : 'text-primary hover:underline'}`}
                    >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                    </button>

                    {devOtp && (
                      <div className="w-full bg-[#fef3c7] border border-[#fbbf24]/30 rounded-lg p-3 text-center">
                        <p className="text-[#92400e] text-[11px] font-bold uppercase tracking-wider mb-1">⚠ Dev Mode: OTP is</p>
                        <p className="text-[#d97706] font-mono text-2xl font-black tracking-[0.2em]">{devOtp}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-[#f9fafb] border-t border-[#f3f4f6] flex justify-center gap-6">
            <Link to="/login/csc" className="text-[12px] font-bold text-[#6b7280] hover:text-primary transition-colors">CSC Operator Login</Link>
            <div className="w-px h-4 bg-[#d1d5db]" />
            <Link to="/login/admin" className="text-[12px] font-bold text-[#6b7280] hover:text-primary transition-colors">Admin Login</Link>
          </div>
        </GovCard>

        <footer className="mt-8 text-center space-y-1">
          <p className="text-[12px] text-[#6b7280] font-medium uppercase tracking-wider">
            © 2026 Bhuvigyan | NIC | Ministry of Agriculture
          </p>
          <p className="text-[11px] text-[#9ca3af]">
            Designed & Developed by National Informatics Centre
          </p>
        </footer>
      </main>
    </div>
  );
}