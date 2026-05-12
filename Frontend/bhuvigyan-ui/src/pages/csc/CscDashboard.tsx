import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, CheckCircle, Copy, Printer, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import EmptyState from '../../components/ui/EmptyState';
import { farmerApi } from '../../api/farmer';
import { cscApi } from '../../api/csc';
import { locationApi } from '../../api/locations';
import { CROP_TYPES } from '../../utils/constants';
import type { Location } from '../../types';

interface RegistrationRecord {
  name: string;
  mobile: string;
  udlrn: string;
  time: string;
}

export default function CscDashboard() {
  const [step, setStep] = useState<'form' | 'success'>('form');

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [landArea, setLandArea] = useState('');
  const [crop, setCrop] = useState('PADDY');

  const [states, setStates] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [taluks, setTaluks] = useState<Location[]>([]);
  const [hoblis, setHoblis] = useState<Location[]>([]);
  const [villages, setVillages] = useState<Location[]>([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluk, setSelectedTaluk] = useState('');
  const [selectedHobli, setSelectedHobli] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  const [loadingLocation, setLoadingLocation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [registeredToday, setRegisteredToday] = useState<RegistrationRecord[]>([]);
  const [generatedUdlrn, setGeneratedUdlrn] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const [lookupMobile, setLookupMobile] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    setLoadingLocation('states');
    try {
      const res = await locationApi.getStates();
      setStates((res as any).data?.data || (res as any).data || []);
    } catch {
      toast.error('Failed to load states');
    } finally {
      setLoadingLocation(null);
    }
  };

  const loadDistricts = async (stateId: string) => {
    setLoadingLocation('districts');
    try {
      const res = await locationApi.getDistricts(stateId);
      setDistricts((res as any).data?.data || (res as any).data || []);
    } catch {
      toast.error('Failed to load districts');
    } finally {
      setLoadingLocation(null);
    }
  };

  const loadTaluks = async (districtId: string) => {
    setLoadingLocation('taluks');
    try {
      const res = await locationApi.getTaluks(districtId);
      setTaluks((res as any).data?.data || (res as any).data || []);
    } catch {
      toast.error('Failed to load taluks');
    } finally {
      setLoadingLocation(null);
    }
  };

  const loadHoblis = async (talukId: string) => {
    setLoadingLocation('hoblis');
    try {
      const res = await locationApi.getHoblis(talukId);
      setHoblis((res as any).data?.data || (res as any).data || []);
    } catch {
      toast.error('Failed to load hoblis');
    } finally {
      setLoadingLocation(null);
    }
  };

  const loadVillages = async (hobliId: string) => {
    setLoadingLocation('villages');
    try {
      const res = await locationApi.getVillages(hobliId);
      setVillages((res as any).data?.data || (res as any).data || []);
    } catch {
      toast.error('Failed to load villages');
    } finally {
      setLoadingLocation(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName || fullName.length < 3) errs.fullName = 'Name must be at least 3 characters';
    if (!mobile || mobile.length !== 10) errs.mobile = 'Enter valid 10-digit mobile number';
    if (!landArea || parseFloat(landArea) < 0.1) errs.landArea = 'Min 0.1 Ha required';
    if (!selectedState) errs.state = 'Select state';
    if (!selectedDistrict) errs.district = 'Select district';
    if (!selectedTaluk) errs.taluk = 'Select taluk';
    if (!selectedHobli) errs.hobli = 'Select hobli';
    if (!selectedVillage) errs.village = 'Select village';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await cscApi.registerFarmer({
        fullName,
        mobile,
        stateCode: selectedState,
        districtCode: selectedDistrict,
        districtId: selectedDistrict,
        talukId: selectedTaluk,
        hobliId: selectedHobli,
        villageId: selectedVillage,
        landAreaHa: parseFloat(landArea),
        declaredCrop: crop,
      });
      const raw = res.data;
      const data = raw?.data || raw || {};
      const udlrn = data.udlrn || '';
      const devOtpVal = data.devOtp || '123456';
      setGeneratedUdlrn(udlrn);
      setDevOtp(devOtpVal);
      setRegisteredToday((prev) => [
        { name: fullName, mobile, udlrn, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStep('success');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setMobile('');
    setLandArea('');
    setCrop('PADDY');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedTaluk('');
    setSelectedHobli('');
    setSelectedVillage('');
    setDistricts([]);
    setTaluks([]);
    setHoblis([]);
    setVillages([]);
    setErrors({});
    setStep('form');
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">CSC Registration Portal</h1>
        <p className="text-[#6b7280]">Service Point: <span className="font-bold text-primary">Doddaballapura - CSC-KA-001</span></p>
      </div>
          <div className="flex gap-4">
            <div className="bg-white px-6 py-4 rounded-xl border border-[#e5e7eb] shadow-sm min-w-[280px]">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Daily Enrolment Limit</p>
                <p className="text-[12px] font-black text-[#1a1a1a]">{registeredToday.length} / 50</p>
              </div>
              <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(registeredToday.length / 50) * 100}%` }}
                  className={`h-full transition-all ${
                    registeredToday.length >= 50 ? 'bg-danger' : 
                    registeredToday.length >= 40 ? 'bg-warning' : 'bg-primary'
                  }`}
                />
              </div>
              {registeredToday.length >= 50 ? (
                <p className="text-[10px] text-danger font-bold flex items-center gap-1">
                   <AlertTriangle size={12} /> Daily limit reached. Resume tomorrow.
                </p>
              ) : registeredToday.length >= 40 ? (
                <p className="text-[10px] text-warning font-bold flex items-center gap-1">
                   <AlertTriangle size={12} /> Approaching daily limit (40/50)
                </p>
              ) : (
                <p className="text-[10px] text-[#9ca3af] font-medium">Resetting in 14h 22m</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* REGISTRATION FORM */}
          <div className="lg:col-span-2">
            <GovCard topBorder="green" className="p-0 overflow-hidden shadow-lg">
              <div className="px-8 py-5 border-b border-[#f3f4f6] bg-[#f9fafb]">
                <h2 className="text-[18px] font-bold text-[#1a1a1a] flex items-center gap-2">
                  <UserPlus className="text-primary" />
                  New Farmer Enrolment
                </h2>
              </div>

              <div className="p-8">
                {step === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-md">
                      <CheckCircle size={40} className="text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[22px] font-black text-primary">Registration Successful!</h3>
                      <p className="text-[#6b7280]">Farmer has been registered in the Bhuvigyan system.</p>
                    </div>

                    <div className="bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-2xl p-8 max-w-sm mx-auto">
                      <p className="text-[11px] font-bold text-[#1a6b3c] uppercase tracking-widest mb-2">Unique Land ID (UDLRN)</p>
                      <p className="font-mono text-[24px] font-black text-[#1a6b3c] tracking-wider mb-4">{generatedUdlrn}</p>
                      <div className="flex justify-center gap-2">
                        <GovButton variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(generatedUdlrn);
                          toast.success('UDLRN Copied');
                        }}>
                          <Copy size={14} /> Copy ID
                        </GovButton>
                        <GovButton variant="outline" size="sm">
                          <Printer size={14} /> Print Receipt
                        </GovButton>
                      </div>
                    </div>

                    {devOtp && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fef3c7] border border-[#fbbf24]/30 rounded-full text-[#d97706] text-[13px] font-bold">
                        <AlertTriangle size={14} />
                        Dev OTP for first login: <span className="font-mono">{devOtp}</span>
                      </div>
                    )}

                    <div className="pt-6">
                      <GovButton variant="primary" size="lg" onClick={resetForm}>
                        Register Another Farmer
                      </GovButton>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    {/* PERSONAL DETAILS */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] whitespace-nowrap">Personal Details</span>
                        <div className="h-px bg-[#f3f4f6] w-full" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <GovInput
                          label="Full Name (As per Aadhaar)"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: Rajesh Kumar"
                          required
                          error={errors.fullName}
                        />
                        <GovInput
                          label="Mobile Number"
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          required
                          error={errors.mobile}
                        />
                      </div>
                    </div>

                    {/* LOCATION DETAILS */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] whitespace-nowrap">Location & Land</span>
                        <div className="h-px bg-[#f3f4f6] w-full" />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-[#1a1a1a]">State <span className="text-danger">*</span></label>
                          <select
                            className="gov-input"
                            value={selectedState}
                            onChange={(e) => {
                              setSelectedState(e.target.value);
                              setSelectedDistrict('');
                              if (e.target.value) loadDistricts(e.target.value);
                            }}
                          >
                            <option value="">Select State</option>
                            {states.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-[#1a1a1a]">District <span className="text-danger">*</span></label>
                          <select
                            className="gov-input"
                            value={selectedDistrict}
                            disabled={!selectedState}
                            onChange={(e) => {
                              setSelectedDistrict(e.target.value);
                              if (e.target.value) loadTaluks(e.target.value);
                            }}
                          >
                            <option value="">Select District</option>
                            {districts.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-[#1a1a1a]">Taluk <span className="text-danger">*</span></label>
                          <select
                            className="gov-input"
                            value={selectedTaluk}
                            disabled={!selectedDistrict}
                            onChange={(e) => {
                              setSelectedTaluk(e.target.value);
                              if (e.target.value) loadHoblis(e.target.value);
                            }}
                          >
                            <option value="">Select Taluk</option>
                            {taluks.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-[#1a1a1a]">Village <span className="text-danger">*</span></label>
                          <select
                            className="gov-input"
                            value={selectedVillage}
                            disabled={!selectedTaluk}
                            onChange={(e) => setSelectedVillage(e.target.value)}
                          >
                            <option value="">Select Village</option>
                            {villages.map((v) => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                      <GovInput
                        label="Land Area (in Hectares)"
                        type="number"
                        value={landArea}
                        onChange={(e) => setLandArea(e.target.value)}
                        placeholder="0.00"
                        min="0.1"
                        step="0.01"
                        required
                        error={errors.landArea}
                      />
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-[#1a1a1a]">Primary Crop <span className="text-danger">*</span></label>
                        <select
                          className="gov-input"
                          value={crop}
                          onChange={(e) => setCrop(e.target.value)}
                        >
                          {CROP_TYPES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-[#f3f4f6]">
                      <GovButton
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={handleSubmit}
                        loading={submitting}
                        className="h-[52px] text-[16px]"
                      >
                        Register Farmer & Generate UDLRN
                      </GovButton>
                    </div>
                  </div>
                )}
              </div>
            </GovCard>
          </div>

          {/* SIDEBAR: TODAY'S REGISTRATIONS */}
          <div className="space-y-8">
            <GovCard className="p-0 overflow-hidden">
              <div className="px-6 py-4 bg-[#f9fafb] border-b border-[#f3f4f6]">
                <h3 className="font-bold text-[#1a1a1a]">Recent Registrations</h3>
              </div>
              {registeredToday.length === 0 ? (
                <div className="p-12 text-center">
                  <UserPlus size={48} className="text-[#d1d5db] mx-auto mb-4" />
                  <p className="text-[#9ca3af] text-sm">Farmers registered today will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#f3f4f6] max-h-[600px] overflow-y-auto">
                  {registeredToday.map((record, i) => (
                    <div key={i} className="p-4 hover:bg-[#f0fdf4] transition-colors border-l-4 border-transparent hover:border-primary">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-[#1a1a1a] text-sm">{record.name}</span>
                        <span className="text-[10px] text-[#9ca3af] font-medium">{record.time}</span>
                      </div>
                      <p className="text-[12px] text-[#6b7280] mb-2">{record.mobile}</p>
                      <div className="bg-[#f3f4f6] px-2 py-1 rounded font-mono text-[11px] font-bold text-primary w-fit">
                        {record.udlrn}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GovCard>

            <GovCard className="p-6 bg-[#dbeafe] border-[#93c5fd]">
              <div className="flex items-center gap-3 mb-3">
                <Search className="text-[#1e40af]" size={20} />
                <h3 className="font-bold text-[#1e40af]">Quick Lookup</h3>
              </div>
              <div className="space-y-3">
                <GovInput
                  placeholder="Farmer Mobile Number"
                  value={lookupMobile}
                  onChange={(e) => setLookupMobile(e.target.value.replace(/\D/g, ''))}
                  className="bg-white"
                />
                <GovButton variant="blue" fullWidth size="sm" onClick={() => toast.error('Farmer not found')}>
                  Check Enrolment Status
                </GovButton>
              </div>
            </GovCard>
          </div>
        </div>
    </div>
  );
}