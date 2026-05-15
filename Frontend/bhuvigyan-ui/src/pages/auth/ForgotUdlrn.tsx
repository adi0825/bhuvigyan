import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import { farmerApi } from '../../api/farmer';
import { Link } from 'react-router-dom';

export default function ForgotUdlrn() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ udlrn: string; fullName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await farmerApi.forgotUdlrn(mobile);
      const data = res.data?.data;
      if (data?.udlrn) {
        setResult({ udlrn: data.udlrn, fullName: data.fullName });
        toast.success('UDLRN retrieved successfully');
      } else {
        toast.error('Unable to retrieve UDLRN');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.detail || 'Failed to retrieve UDLRN';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.udlrn);
    setCopied(true);
    toast.success('UDLRN copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#f0fdf4]">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a6b3c' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
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
            <h2 className="text-[16px] font-bold text-[#1a1a1a]">Forgot UDLRN? / यूडीएलआरएन भूल गए?</h2>
          </div>

          <div className="p-8 pt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {result ? (
                <div className="space-y-4">
                  <div className="bg-[#f0fdf4] border border-[#86efac] rounded-xl p-5 text-center space-y-3">
                    <CheckCircle className="w-10 h-10 text-[#1a6b3c] mx-auto" />
                    <p className="text-sm text-[#6b7280]">UDLRN found for <span className="font-bold text-[#1a1a1a]">{result.fullName}</span></p>
                    <div className="bg-white rounded-lg border border-[#86efac] p-3 flex items-center justify-between gap-3">
                      <span className="font-mono text-lg font-bold text-[#1a6b3c] tracking-wider">{result.udlrn}</span>
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg hover:bg-[#f0fdf4] text-[#1a6b3c] transition-colors"
                        title="Copy UDLRN"
                      >
                        {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <GovButton fullWidth size="lg" onClick={() => { setResult(null); setMobile(''); }} className="h-[52px] text-[15px]">
                    Check Another Mobile
                  </GovButton>
                  <Link to="/login/farmer" className="block text-center text-sm font-bold text-[#1a6b3c] hover:underline">
                    Back to Login
                  </Link>
                </div>
              ) : (
                <>
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
                        placeholder="Enter registered mobile"
                        className="gov-input h-[48px] text-lg font-semibold tracking-wider flex-1"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-[#9ca3af]">Enter the mobile number registered with your farmer account</p>
                  </div>

                  <GovButton
                    fullWidth
                    size="lg"
                    onClick={handleSubmit}
                    loading={loading}
                    className="h-[52px] text-[15px]"
                  >
                    Retrieve UDLRN
                  </GovButton>

                  <div className="flex flex-col items-center gap-2">
                    <Link to="/login/farmer" className="flex items-center gap-2 text-sm font-bold text-[#1a6b3c] hover:underline">
                      <ArrowLeft size={16} />
                      Back to Login
                    </Link>
                    <p className="text-center text-[13px] text-[#6b7280]">
                      New farmer? <Link to="/register" className="text-primary font-bold hover:underline">Register via CSC</Link>
                    </p>
                  </div>
                </>
              )}
            </motion.div>
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
