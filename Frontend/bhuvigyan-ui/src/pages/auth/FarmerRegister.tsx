import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, CheckCircle, Smartphone, MapPin, Banknote, ShieldCheck, ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import GovButton from '../../components/ui/GovButton';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import { farmerApi } from '../../api/farmer';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, title: 'Personal Info', icon: Smartphone },
  { id: 2, title: 'Land Location', icon: MapPin },
  { id: 3, title: 'Land & Bank', icon: Banknote },
  { id: 4, title: 'Verify & Submit', icon: ShieldCheck },
];

const LANGUAGES = ['English', 'हिंदी', 'ಕನ್ನಡ', 'తెలుగు', 'मराठी', 'ਪੰਜਾਬੀ'];
const STATES = ['Karnataka', 'Maharashtra', 'Andhra Pradesh', 'Tamil Nadu', 'Telangana', 'Gujarat', 'Punjab', 'Uttar Pradesh'];

// Cascading location data (simplified for demo — real system uses GeoJSON)
const LOCATION_DATA: any = {
  Karnataka: {
    'Bengaluru Rural': { Doddaballapura: ['Hosahalli', 'Mylanahalli'], Devanahalli: ['Kundana', 'Nallurahalli'] },
    Tumkur: { Tumkur: ['Kunigal', 'Tiptur'], Sira: ['Pavagada', 'Madakasira'] },
    Bagalkot: { Bagalkot: ['Badami', 'Bilagi'], Jamkhandi: ['Rabakavi', 'Mudhol'] },
  },
};

export default function FarmerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(false);

  const [form, setForm] = useState({
    fullName: '', mobile: '', language: 'English', dob: '', gender: 'Male', aadhaar: '',
    state: 'Karnataka', district: 'Bengaluru Rural', taluk: 'Doddaballapura', hobli: '', village: '',
    surveyNumber: '', landAreaHa: '', ownershipType: 'owner',
    bankAccount: '', bankIfsc: '', bankName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.fullName || form.fullName.length < 3) e.fullName = 'Min 3 characters';
      if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required';
      if (!form.dob) e.dob = 'Date of birth required';
      if (!/^\d{12}$/.test(form.aadhaar)) e.aadhaar = '12-digit Aadhaar required';
    }
    if (step === 2) {
      if (!form.state || !form.district || !form.taluk || !form.village) e.location = 'All location fields required';
    }
    if (step === 3) {
      if (!form.surveyNumber) e.surveyNumber = 'Survey number required';
      if (!form.landAreaHa || parseFloat(form.landAreaHa) <= 0) e.landAreaHa = 'Valid area required';
      if (!form.bankAccount || form.bankAccount.length < 9) e.bankAccount = 'Valid account number required';
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) e.bankIfsc = 'Valid IFSC required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => Math.min(4, s + 1));
  };

  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const districts = Object.keys(LOCATION_DATA[form.state] || {});
  const taluks = form.district ? Object.keys(LOCATION_DATA[form.state]?.[form.district] || {}) : [];
  const villages = form.taluk ? (LOCATION_DATA[form.state]?.[form.district]?.[form.taluk] || []) : [];

  const handleSubmit = async () => {
    if (!otp || otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setSubmitting(true);
    try {
      await farmerApi.register({
        fullName: form.fullName, mobile: form.mobile, language: form.language,
        dob: form.dob, gender: form.gender, aadhaar: form.aadhaar,
        state: form.state, district: form.district, taluk: form.taluk,
        hobli: form.hobli, village: form.village, surveyNumber: form.surveyNumber,
        landAreaHa: parseFloat(form.landAreaHa), ownershipType: form.ownershipType,
        bankAccount: form.bankAccount, bankIfsc: form.bankIfsc, bankName: form.bankName,
      });
      toast.success('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login/farmer'), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally { setSubmitting(false); }
  };

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile)) { toast.error('Enter valid mobile first'); return; }
    setOtpSent(true);
    toast.success('OTP sent to ' + form.mobile);
  };

  const maskAadhaar = (a: string) => a.replace(/(\d{4})(\d{4})(\d{4})/, 'XXXX-XXXX-$3');

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <GovStrip />
      <PageBackground />
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Farmer Registration</h1>
            <p className="text-[#6b7280] text-sm mt-1">PMFBY Insurance Portal — Step {step} of 4</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 px-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s.id ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.id}
                </div>
                <span className={`ml-2 text-xs font-medium hidden sm:block ${step >= s.id ? 'text-green-700' : 'text-gray-400'}`}>{s.title}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-1 mx-3 rounded ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Personal Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="As per Aadhaar" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile <span className="text-red-500">*</span></label>
                      <input type="tel" maxLength={10} value={form.mobile} onChange={e => update('mobile', e.target.value.replace(/\D/g, ''))} placeholder="9900000001" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                      {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                      <select value={form.language} onChange={e => update('language', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5">
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                      <input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                      {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <div className="flex gap-3 mt-2">
                        {['Male', 'Female', 'Other'].map(g => (
                          <button key={g} onClick={() => update('gender', g)} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.gender === g ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-600'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showAadhaar ? 'text' : 'password'} maxLength={12} value={form.aadhaar} onChange={e => update('aadhaar', e.target.value.replace(/\D/g, ''))} placeholder="1234-5678-9012" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10" />
                      <button onClick={() => setShowAadhaar(!showAadhaar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.aadhaar.length === 12 && <p className="text-green-600 text-xs mt-1">{maskAadhaar(form.aadhaar)}</p>}
                    {errors.aadhaar && <p className="text-red-500 text-xs mt-1">{errors.aadhaar}</p>}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Land Location</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select value={form.state} onChange={e => { update('state', e.target.value); update('district', ''); update('taluk', ''); update('village', ''); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5">
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                      <select value={form.district} onChange={e => { update('district', e.target.value); update('taluk', ''); update('village', ''); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5">
                        <option value="">Select District</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Taluk</label>
                      <select value={form.taluk} onChange={e => { update('taluk', e.target.value); update('village', ''); }} className="w-full border border-gray-300 rounded-lg px-4 py-2.5">
                        <option value="">Select Taluk</option>
                        {taluks.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                      <select value={form.village} onChange={e => update('village', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5">
                        <option value="">Select Village</option>
                        {villages.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hobli (Optional)</label>
                    <input type="text" value={form.hobli} onChange={e => update('hobli', e.target.value)} placeholder="Hobli name" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                  </div>
                  {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Land & Banking Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Survey Number <span className="text-red-500">*</span></label>
                      <input type="text" value={form.surveyNumber} onChange={e => update('surveyNumber', e.target.value)} placeholder="124/2-A" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                      {errors.surveyNumber && <p className="text-red-500 text-xs mt-1">{errors.surveyNumber}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Land Area (Ha) <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={form.landAreaHa} onChange={e => update('landAreaHa', e.target.value)} placeholder="2.5" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                      {errors.landAreaHa && <p className="text-red-500 text-xs mt-1">{errors.landAreaHa}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ownership Type</label>
                    <div className="flex gap-3">
                      {['owner', 'tenant', 'sharecropper'].map(t => (
                        <button key={t} onClick={() => update('ownershipType', t)} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${form.ownershipType === t ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-600'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> Bank Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Account Number <span className="text-red-500">*</span></label>
                        <input type="text" value={form.bankAccount} onChange={e => update('bankAccount', e.target.value)} placeholder="1234567890" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        {errors.bankAccount && <p className="text-red-500 text-xs mt-1">{errors.bankAccount}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">IFSC Code <span className="text-red-500">*</span></label>
                        <input type="text" value={form.bankIfsc} onChange={e => update('bankIfsc', e.target.value.toUpperCase())} placeholder="SBIN0001234" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        {errors.bankIfsc && <p className="text-red-500 text-xs mt-1">{errors.bankIfsc}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                        <input type="text" value={form.bankName} onChange={e => update('bankName', e.target.value)} placeholder="Auto-filled from IFSC" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-700">Document upload will be required after registration. Please keep RTC/Pahani, Aadhaar, and Passbook ready.</p>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Verify & Submit</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <p><strong>Name:</strong> {form.fullName}</p>
                    <p><strong>Mobile:</strong> {form.mobile}</p>
                    <p><strong>Aadhaar:</strong> {maskAadhaar(form.aadhaar)}</p>
                    <p><strong>Location:</strong> {form.village}, {form.taluk}, {form.district}, {form.state}</p>
                    <p><strong>Land:</strong> {form.surveyNumber} — {form.landAreaHa} Ha ({form.ownershipType})</p>
                    <p><strong>Bank:</strong> {form.bankName || form.bankIfsc}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit OTP</label>
                    {!otpSent ? (
                      <GovButton variant="primary" onClick={sendOtp}>Send OTP to {form.mobile}</GovButton>
                    ) : (
                      <div className="space-y-2">
                        <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-center tracking-[0.5em] font-mono text-lg" />
                        <p className="text-xs text-gray-500">OTP sent to {form.mobile}. Use 123456 for demo.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <GovButton variant="outline" onClick={handleBack} disabled={step === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </GovButton>
              {step < 4 ? (
                <GovButton variant="primary" onClick={handleNext}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </GovButton>
              ) : (
                <GovButton variant="primary" onClick={handleSubmit} disabled={submitting || !otpSent || otp.length !== 6}>
                  {submitting ? 'Submitting...' : 'Register & Submit'}
                </GovButton>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
