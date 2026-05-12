import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import OtpInput from '../../components/ui/OtpInput';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import { officerApi } from '../../api/officer';
import { useAuth } from '../../auth/AuthContext';

export default function OfficerLogin() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await officerApi.sendOtp(email);
      setStep('verify');
      toast.success('OTP sent to your registered device');
    } catch (error: any) {
      console.error('Officer send-otp error:', error);
      const msg = !error.response ? 'Backend not reachable. Make sure server is running on port 8000.' : (error.response?.data?.error?.message || error.response?.data?.detail || error.response?.data?.message || 'Failed to send OTP');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await officerApi.login(email, otp) as any;
      const data = response.data?.data || response.data;
      if (data?.accessToken) login(data.accessToken, data.refreshToken);
      toast.success('Login successful!');
      window.location.href = '/field/dashboard';
    } catch (error: any) {
      console.error('Officer login error:', error);
      const msg = !error.response ? 'Backend not reachable. Make sure server is running on port 8000.' : (error.response?.data?.error?.message || error.response?.data?.detail || error.response?.data?.message || 'Invalid OTP');
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
              <ClipboardList size={32} className="text-[#0057a8]" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">Field Officer Portal</h1>
            <p className="text-[#6b7280] text-[14px]">
              {step === 'send' ? 'Enter your registered email' : 'Enter 6-digit OTP'}
            </p>
          </div>

          <GovCard className="p-8">
            <div className="space-y-6">
              {step === 'send' ? (
                <>
                  <GovInput label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@bhuvigyan.gov.in" />
                  <GovButton fullWidth size="lg" onClick={handleSendOtp} loading={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send OTP</span><ArrowRight size={18} /></>}
                  </GovButton>
                  <div className="text-center">
                    <p className="text-[12px] text-[#9ca3af]">Demo: inspector1@bhuvigyan.gov.in</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-[#6b7280] text-[14px]">OTP sent to your registered device</p>
                  <OtpInput length={6} onComplete={(val) => setOtp(val)} />
                  <GovButton fullWidth size="lg" onClick={handleVerify} loading={loading}>
                    Verify & Login
                  </GovButton>
                  <div className="bg-[#fef3c7] border border-[#fbbf24]/30 rounded-lg p-3 text-center">
                    <p className="text-[#92400e] text-[11px] font-bold">Dev Mode: OTP is</p>
                    <p className="text-[#d97706] font-mono text-2xl font-black tracking-widest">123456</p>
                  </div>
                  <button onClick={() => setStep('send')} className="w-full text-[13px] text-[#6b7280] hover:text-primary">
                    Resend OTP
                  </button>
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
