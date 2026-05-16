import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, CheckCircle, Smartphone, MapPin, Banknote, ShieldCheck,
  ChevronRight, ChevronLeft, Eye, EyeOff, Loader2, ExternalLink,
  Upload, FileText, Image as ImageIcon, Check, X, Sprout,
  Droplets, AlertTriangle, Ruler
} from 'lucide-react';
import GovButton from '../../components/ui/GovButton';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import toast from 'react-hot-toast';
import { farmerApi } from '../../api/farmer';

const STEPS = [
  { id: 1, title: 'Personal Info', icon: Smartphone },
  { id: 2, title: 'Land Records', icon: MapPin },
  { id: 3, title: 'Bank & Docs', icon: Banknote },
  { id: 4, title: 'Review & Submit', icon: ShieldCheck },
];

const LANGUAGES = ['English', 'Hindi', 'Kannada', 'Marathi', 'Telugu'];
const GENDERS = ['Male', 'Female', 'Other'];

const DOC_FIELDS = [
  { key: 'aadhaar', label: 'Aadhaar Card', accept: '.pdf,.jpg,.jpeg' },
  { key: 'rtc', label: 'RTC / Pahani Certificate', accept: '.pdf' },
  { key: 'bank', label: 'Bank Passbook / Cancelled Cheque', accept: '.pdf,.jpg,.jpeg' },
  { key: 'land', label: 'Land Ownership Proof', accept: '.pdf' },
  { key: 'photo', label: 'Recent Passport Photo', accept: '.jpg,.jpeg,.png' },
];

function maskAadhaar(a: string) {
  return a.replace(/(\d{4})(\d{4})(\d{4})/, 'XXXX-XXXX-$3');
}

function generateUdlrm(stateCode: string) {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `UDLRM-${stateCode}-2026-${rand}`;
}

const STORAGE_KEY = 'farmerRegistrationDraft';
const LAND_DATA_KEY = 'farmerLandData';

export default function FarmerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedUdlrm, setGeneratedUdlrm] = useState('');
  const [landData, setLandData] = useState<any>(null);
  const landPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, aadhaar: parsed.aadhaar || '' };
      } catch { /* ignore */ }
    }
    return {
      fullName: '', mobile: '', language: 'English', dob: '', gender: 'Male', aadhaar: '',
      state: 'Karnataka', district: '', taluk: '', village: '', surveyNumber: '',
      landAreaHa: '',
      bankName: '', bankAccount: '', bankIfsc: '', branchName: '',
      docs: {} as Record<string, { name: string; size: string }>,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Persist form
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  // Poll for land data from portal + listen for postMessage
  useEffect(() => {
    if (step === 2) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'LAND_DATA_READY' && event.data?.payload) {
          const payload = event.data.payload;
          if (payload.coordinatesVerified === true) {
            setLandData(payload);
            localStorage.setItem(LAND_DATA_KEY, JSON.stringify(payload));
            if (landPollRef.current) {
              clearInterval(landPollRef.current);
              landPollRef.current = null;
            }
          }
        }
      };
      window.addEventListener('message', handleMessage);

      const check = () => {
        const raw = localStorage.getItem(LAND_DATA_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.coordinatesVerified === true) {
              setLandData(parsed);
              if (landPollRef.current) {
                clearInterval(landPollRef.current);
                landPollRef.current = null;
              }
            }
          } catch { /* ignore */ }
        }
      };
      check();
      landPollRef.current = setInterval(check, 1000);

      return () => {
        window.removeEventListener('message', handleMessage);
        if (landPollRef.current) clearInterval(landPollRef.current);
      };
    }
  }, [step]);

  const update = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const handleFileDrop = (docKey: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const size = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setForm(f => ({ ...f, docs: { ...f.docs, [docKey]: { name: file.name, size } } }));
    toast.success(`${DOC_FIELDS.find(d => d.key === docKey)?.label} uploaded`);
  };

  const removeFile = (docKey: string) => {
    setForm(f => {
      const nd = { ...f.docs };
      delete nd[docKey];
      return { ...f, docs: nd };
    });
  };

  const openLandPortal = () => {
    window.open('/land-portal', '_blank', 'width=1200,height=800');
  };

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.fullName || form.fullName.length < 3) e.fullName = 'Full name required (min 3 chars)';
      if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required';
      if (!form.dob) e.dob = 'Date of birth required';
      if (!/^\d{12}$/.test(form.aadhaar)) e.aadhaar = '12-digit Aadhaar required';
    }
    if (step === 2) {
      if (!landData) e.land = 'Please fetch land data from the Land Verification Portal';
    }
    if (step === 3) {
      if (!form.bankName) e.bankName = 'Bank name required';
      if (!form.bankAccount || form.bankAccount.length < 9) e.bankAccount = 'Valid account number required';
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) e.bankIfsc = 'Valid IFSC required';
      if (!form.branchName) e.branchName = 'Branch name required';
      if (Object.keys(form.docs).length < 3) e.docs = 'Please upload at least 3 documents';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => Math.min(4, s + 1));
  };

  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (!confirmCheck) { toast.error('Please confirm the details'); return; }
    setSubmitting(true);
    try {
      const stateCode = landData?.state
        ? ({ Karnataka: 'KA', Maharashtra: 'MH', Telangana: 'TS', Punjab: 'PB', Rajasthan: 'RJ', 'Uttar Pradesh': 'UP' } as any)[landData.state] || 'KA'
        : 'KA';

      const payload = {
        fullName: form.fullName,
        mobile: form.mobile,
        aadhaar: form.aadhaar,
        gender: form.gender,
        dob: form.dob ? new Date(form.dob).toISOString() : undefined,
        village: form.village || landData?.village || '',
        taluk: form.taluk || landData?.taluk || '',
        district: form.district || landData?.district || '',
        state_code: stateCode,
        pincode: '',
        bank_name: form.bankName,
        bank_ifsc: form.bankIfsc,
        bank_account: form.bankAccount,
        land_area: parseFloat(form.landAreaHa) || landData?.area || 2.5,
        land_unit: 'ha',
        crop_name: landData?.cropType || 'PADDY',
        latitude: landData?.lat,
        longitude: landData?.lng,
        // Include landData from shared schema
        landData: landData || undefined,
      };

      const response = await farmerApi.register(payload as any);
      const data = response.data?.data;
      const udlrmNumber = data?.udlrmNumber || data?.udlrn || generateUdlrm(stateCode);
      if (udlrmNumber) {
        setGeneratedUdlrm(udlrmNumber);
        localStorage.setItem('farmerRegistration', JSON.stringify({
          udlrmNumber, mobile: form.mobile, fullName: form.fullName,
          registeredAt: new Date().toISOString(),
        }));
        toast.success('Registration successful! UDLRM: ' + udlrmNumber);
        setShowSuccessModal(true);
      } else {
        toast.error('Registration failed: no UDLRM returned');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const proceedToLogin = () => {
    localStorage.removeItem(LAND_DATA_KEY);
    localStorage.removeItem(STORAGE_KEY);
    navigate('/login/farmer');
  };

  const stateCode = landData?.state
    ? ({ Karnataka: 'KA', Maharashtra: 'MH', Telangana: 'TS', Punjab: 'PB', Rajasthan: 'RJ', 'Uttar Pradesh': 'UP' } as any)[landData.state] || 'KA'
    : 'KA';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <GovStrip />
      <PageBackground />
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
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
                  step >= s.id ? 'bg-[#1a6b3c] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.id}
                </div>
                <span className={`ml-2 text-xs font-medium hidden sm:block ${step >= s.id ? 'text-[#1a6b3c]' : 'text-gray-400'}`}>{s.title}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-1 mx-3 rounded ${step > s.id ? 'bg-[#1a6b3c]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-6 md:p-8">
            <AnimatePresence mode="wait">
              {/* STEP 1 — Personal Details */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Personal Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(as per Aadhaar)</span></label>
                    <input type="text" value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Enter your full name" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c] focus:border-[#1a6b3c]" />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                      <input type="tel" maxLength={10} value={form.mobile} onChange={e => update('mobile', e.target.value.replace(/\D/g, ''))} placeholder="9900000001" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                      <select value={form.language} onChange={e => update('language', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]">
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(dd-mm-yyyy)</span></label>
                      <input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <div className="flex gap-2 mt-1">
                        {GENDERS.map(g => (
                          <button key={g} onClick={() => update('gender', g)} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.gender === g ? 'bg-[#f0fdf4] border-[#1a6b3c] text-[#1a6b3c]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(1234-5678-9012)</span></label>
                    <div className="relative">
                      <input type={showAadhaar ? 'text' : 'password'} maxLength={12} value={form.aadhaar} onChange={e => update('aadhaar', e.target.value.replace(/\D/g, ''))} placeholder="Enter 12-digit Aadhaar" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      <button type="button" onClick={() => setShowAadhaar(!showAadhaar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.aadhaar.length === 12 && <p className="text-green-600 text-xs mt-1 font-mono">{maskAadhaar(form.aadhaar)}</p>}
                    {errors.aadhaar && <p className="text-red-500 text-xs mt-1">{errors.aadhaar}</p>}
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — Land Records Verification */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-2">Land Records Verification</h2>
                  <p className="text-sm text-[#6b7280]">Click below to open the Land Verification Portal and fetch your land details via satellite data.</p>

                  {!landData ? (
                    <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <MapPin className="w-8 h-8 text-[#1a6b3c]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#1a1a1a]">Verify your land via satellite</h3>
                        <p className="text-sm text-[#6b7280] mt-1 max-w-md mx-auto">Open the Land Verification Portal to auto-fetch your land record details, satellite NDVI, and fraud risk analysis.</p>
                      </div>
                      <button onClick={openLandPortal} className="inline-flex items-center gap-2 bg-[#1a6b3c] hover:bg-[#145a30] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                        Open Land Verification Portal <ExternalLink className="w-4 h-4" />
                      </button>
                      {errors.land && <p className="text-red-500 text-xs">{errors.land}</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Green banner - Coordinates Verified */}
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="text-sm font-semibold text-green-800">✅ Coordinates Verified via Satellite</span>
                      </div>

                      {/* Summary Card - Read-only */}
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
                        <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wide">Verified Land Record Summary</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-gray-500">Survey No:</span> <span className="font-medium">{landData.surveyNo}</span></div>
                          <div><span className="text-gray-500">Taluk:</span> <span className="font-medium">{landData.taluk}</span></div>
                          <div><span className="text-gray-500">District:</span> <span className="font-medium">{landData.district}</span></div>
                          <div><span className="text-gray-500">State:</span> <span className="font-medium">{landData.state}</span></div>
                          <div><span className="text-gray-500">Land Area:</span> <span className="font-medium">{(landData.area * 2.47105).toFixed(2)} ac ({landData.area} ha)</span></div>
                          <div><span className="text-gray-500">Land Use:</span> <span className="font-medium">{landData.landUse}</span></div>
                          <div><span className="text-gray-500">RTC Status:</span> <span className="font-medium text-green-700">{landData.rtcStatus}</span></div>
                        </div>
                        <div className="border-t pt-3 mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-green-600" />
                            <span className="text-gray-500">NDVI:</span>
                            <span className={`font-bold ${landData.ndvi > 0.6 ? 'text-green-700' : landData.ndvi > 0.4 ? 'text-amber-700' : 'text-red-700'}`}>
                              {landData.ndvi.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Crop Health:</span>
                            <span className={`font-bold px-2 py-0.5 rounded text-xs ${landData.cropHealth === 'Healthy' ? 'bg-green-100 text-green-800' : landData.cropHealth === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {landData.cropHealth}
                            </span>
                          </div>
                          <div className="flex items-center gap-2"><span className="text-gray-500">Crop Type:</span> <span className="font-medium">{landData.cropType}</span></div>
                          <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-600" /><span className="text-gray-500">Soil Moisture:</span> <span className="font-bold text-blue-700">{landData.soilMoisture}%</span></div>
                          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-gray-500">Fraud Risk:</span> <span className="font-bold text-amber-700">{landData.fraudScore}/100</span></div>
                          <div className="flex items-center gap-2"><span className="text-gray-500">Last Satellite Date:</span> <span className="font-medium">{new Date(landData.lastSatelliteDate).toLocaleDateString()}</span></div>
                        </div>
                      </div>

                      <button onClick={openLandPortal} className="text-sm text-[#1a6b3c] font-semibold hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" /> Re-open Land Portal to update
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Bank Details & Document Upload */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-1">Bank Details & Document Upload</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name <span className="text-red-500">*</span></label>
                      <input type="text" value={form.bankName} onChange={e => update('bankName', e.target.value)} placeholder="e.g. State Bank of India" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number <span className="text-red-500">*</span></label>
                      <input type="text" value={form.bankAccount} onChange={e => update('bankAccount', e.target.value)} placeholder="Enter account number" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      {errors.bankAccount && <p className="text-red-500 text-xs mt-1">{errors.bankAccount}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code <span className="text-red-500">*</span></label>
                      <input type="text" value={form.bankIfsc} onChange={e => update('bankIfsc', e.target.value.toUpperCase())} placeholder="SBIN0001234" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      {errors.bankIfsc && <p className="text-red-500 text-xs mt-1">{errors.bankIfsc}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name <span className="text-red-500">*</span></label>
                      <input type="text" value={form.branchName} onChange={e => update('branchName', e.target.value)} placeholder="Enter branch name" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a6b3c]" />
                      {errors.branchName && <p className="text-red-500 text-xs mt-1">{errors.branchName}</p>}
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-[#1a6b3c]" /> Upload Documents</h3>
                    <div className="space-y-3">
                      {DOC_FIELDS.map(doc => {
                        const uploaded = form.docs[doc.key];
                        return (
                          <div key={doc.key} className={`rounded-lg border p-4 transition-colors ${uploaded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {uploaded ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <FileText className="w-5 h-5 text-gray-400 shrink-0" />}
                                <div>
                                  <p className={`text-sm font-medium ${uploaded ? 'text-green-800' : 'text-[#1a1a1a]'}`}>{doc.label}</p>
                                  {uploaded && <p className="text-xs text-green-700">{uploaded.name} · {uploaded.size}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {uploaded && (
                                  <button onClick={() => removeFile(doc.key)} className="text-red-500 hover:text-red-700 p-1">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                <label className="cursor-pointer inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:border-[#1a6b3c] text-gray-700 hover:text-[#1a6b3c] text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                                  <Upload className="w-3.5 h-3.5" /> {uploaded ? 'Change' : 'Browse'}
                                  <input type="file" accept={doc.accept} className="hidden" onChange={e => handleFileDrop(doc.key, e.target.files)} />
                                </label>
                              </div>
                            </div>
                            {!uploaded && (
                              <div
                                className="mt-3 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#1a6b3c] hover:bg-white transition-colors"
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); handleFileDrop(doc.key, e.dataTransfer.files); }}
                                onClick={() => { /* triggers the hidden input above via bubbling if needed, but we have browse button */ }}
                              >
                                <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">Drag & drop file here or click Browse</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {errors.docs && <p className="text-red-500 text-xs mt-2">{errors.docs}</p>}
                  </div>
                </motion.div>
              )}

              {/* STEP 4 — Review & Submit */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="text-lg font-bold text-[#1a1a1a] mb-1">Review & Submit</h2>
                  <p className="text-sm text-[#6b7280]">Please verify all details before submitting your application.</p>

                  {/* Personal */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                    <h3 className="font-bold text-[#1a1a1a] text-xs uppercase tracking-wider mb-2">Personal Details</h3>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                      <div><span className="text-gray-500">Name:</span> <span className="font-medium">{form.fullName}</span></div>
                      <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{form.mobile}</span></div>
                      <div><span className="text-gray-500">DOB:</span> <span className="font-medium">{form.dob}</span></div>
                      <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{form.gender}</span></div>
                      <div><span className="text-gray-500">Language:</span> <span className="font-medium">{form.language}</span></div>
                      <div><span className="text-gray-500">Aadhaar:</span> <span className="font-medium font-mono">{maskAadhaar(form.aadhaar)}</span></div>
                    </div>
                  </div>

                  {/* Land & Satellite Data */}
                  {landData && (
                    <div className="bg-[#f0fdf4] rounded-xl border border-green-200 p-4 space-y-2 text-sm">
                      <h3 className="font-bold text-[#1a1a1a] text-xs uppercase tracking-wider mb-2">Satellite Data</h3>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                        <div><span className="text-gray-500">Survey No:</span> <span className="font-medium">{landData.surveyNo}</span></div>
                        <div><span className="text-gray-500">Area:</span> <span className="font-medium">{(landData.area * 2.47105).toFixed(2)} ac ({landData.area} ha)</span></div>
                        <div><span className="text-gray-500">Village:</span> <span className="font-medium">{landData.village}</span></div>
                        <div><span className="text-gray-500">Taluk:</span> <span className="font-medium">{landData.taluk}</span></div>
                        <div><span className="text-gray-500">District:</span> <span className="font-medium">{landData.district}</span></div>
                        <div><span className="text-gray-500">State:</span> <span className="font-medium">{landData.state}</span></div>
                        <div><span className="text-gray-500">NDVI:</span> <span className="font-medium">{landData.ndvi.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">Crop Health:</span> <span className="font-medium">{landData.cropHealth}</span></div>
                        <div><span className="text-gray-500">Crop Type:</span> <span className="font-medium">{landData.cropType}</span></div>
                        <div><span className="text-gray-500">Soil Moisture:</span> <span className="font-medium">{landData.soilMoisture}%</span></div>
                        <div><span className="text-gray-500">Fraud Risk:</span> <span className="font-medium">{landData.fraudScore}/100</span></div>
                        <div><span className="text-gray-500">Last Satellite Date:</span> <span className="font-medium">{new Date(landData.lastSatelliteDate).toLocaleDateString()}</span></div>
                      </div>
                    </div>
                  )}
                  {/* Bank */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-1 text-sm">
                    <h3 className="font-bold text-[#1a1a1a] text-xs uppercase tracking-wider mb-2">Bank Details</h3>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                      <div><span className="text-gray-500">Bank:</span> <span className="font-medium">{form.bankName}</span></div>
                      <div><span className="text-gray-500">Account:</span> <span className="font-medium">****{form.bankAccount.slice(-4)}</span></div>
                      <div><span className="text-gray-500">IFSC:</span> <span className="font-medium">{form.bankIfsc}</span></div>
                      <div><span className="text-gray-500">Branch:</span> <span className="font-medium">{form.branchName}</span></div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm">
                    <h3 className="font-bold text-[#1a1a1a] text-xs uppercase tracking-wider mb-2">Uploaded Documents</h3>
                    <ul className="space-y-1">
                      {DOC_FIELDS.map(d => (
                        <li key={d.key} className="flex items-center gap-2">
                          {form.docs[d.key] ? <Check className="w-3.5 h-3.5 text-green-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                          <span className={form.docs[d.key] ? 'text-gray-700' : 'text-gray-400'}>{d.label}</span>
                          {form.docs[d.key] && <span className="text-xs text-gray-500 ml-auto">{form.docs[d.key].name}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={confirmCheck} onChange={e => setConfirmCheck(e.target.checked)} className="mt-0.5 w-4 h-4 text-[#1a6b3c] border-gray-300 rounded focus:ring-[#1a6b3c]" />
                    <span className="text-sm text-[#1a1a1a]">I confirm all the above details are correct and accurate.</span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
              <GovButton variant="outline" onClick={handleBack} disabled={step === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </GovButton>
              {step < 4 ? (
                <GovButton variant="primary" onClick={handleNext}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </GovButton>
              ) : (
                <GovButton variant="primary" onClick={handleSubmit} disabled={submitting || !confirmCheck}>
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> : 'Submit Application'}
                </GovButton>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1a1a1a]">Registration Successful!</h2>
                <p className="text-sm text-[#6b7280] mt-1">Your application has been submitted for PMFBY crop insurance.</p>
              </div>
              <div className="bg-[#f0fdf4] rounded-xl p-4 border border-green-200">
                <p className="text-sm text-[#6b7280]">Your Farm UDLRM Number is:</p>
                <p className="text-2xl font-black text-[#1a6b3c] font-mono tracking-wider mt-1">{generatedUdlrm}</p>
              </div>
              <p className="text-xs text-[#6b7280]">Please save this number. You will need it to log in.</p>
              <GovButton variant="primary" fullWidth onClick={proceedToLogin}>
                Proceed to Login <ChevronRight className="w-4 h-4 ml-1" />
              </GovButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
