import { useState } from 'react';
import { X, MapPin, Sprout, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const CROPS = [
  'PADDY', 'WHEAT', 'MAIZE', 'SOYBEAN', 'COTTON', 'SUGARCANE',
  'GROUNDNUT', 'SUNFLOWER', 'JOWAR', 'BAJRA', 'RAGI', 'TURMERIC',
  'ONION', 'TOMATO', 'CHILLI', 'BANANA', 'MANGO', 'OTHER',
];

const SEASONS = ['Kharif', 'Rabi', 'Zaid', 'Perennial'];

const STATES = [
  'Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu',
  'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh', 'Punjab',
  'Haryana', 'Bihar', 'West Bengal', 'Odisha', 'Other',
];

export default function AddLandHoldingModal({ isOpen, onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    state: 'Maharashtra',
    district: '',
    taluk: '',
    village: '',
    survey_number: '',
    land_area_acres: '',
    latitude: '',
    longitude: '',
    declared_crop: '',
    season: 'Kharif',
    sowing_date: '',
    has_multiple_crops: false,
    secondary_crop: '',
  });

  if (!isOpen) return null;

  const set = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude', pos.coords.latitude.toFixed(6));
        set('longitude', pos.coords.longitude.toFixed(6));
      },
      err => setError('Could not get location: ' + err.message)
    );
  };

  const handleSubmit = async () => {
    if (!form.district || !form.taluk || !form.village || !form.survey_number) {
      setError('District, Taluk, Village and Survey Number are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        farmer_id: user?.userId,
        state: form.state,
        district: form.district,
        taluk: form.taluk,
        village: form.village,
        survey_number: form.survey_number,
        land_area_acres: form.land_area_acres ? parseFloat(form.land_area_acres) : null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        declared_crop: form.declared_crop || null,
        season: form.season || null,
        sowing_date: form.sowing_date || null,
        has_multiple_crops: form.has_multiple_crops,
        secondary_crop: form.secondary_crop || null,
      };
      const res = await api.post('/my-land/add-land-holding', payload);
      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setStep(1);
          setForm({
            state: 'Maharashtra', district: '', taluk: '', village: '',
            survey_number: '', land_area_acres: '', latitude: '', longitude: '',
            declared_crop: '', season: 'Kharif', sowing_date: '',
            has_multiple_crops: false, secondary_crop: '',
          });
          onAdded();
          onClose();
        }, 1500);
      } else {
        setError(res.data?.error || 'Failed to add land holding');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to add land holding');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#016B4B] focus:ring-1 focus:ring-[#016B4B] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-[#016B4B]" />
            <h2 className="font-bold text-[#111827]">Add Land Holding</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {[1, 2].map(s => (
            <button
              key={s}
              onClick={() => setStep(s as 1 | 2)}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                step === s
                  ? 'text-[#016B4B] border-b-2 border-[#016B4B] bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-50'
              }`}
            >
              {s === 1 ? '① Location Details' : '② Crop Information'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto bg-white">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[#016B4B] text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Land holding added successfully!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>State *</label>
                <select className={inputCls} value={form.state} onChange={e => set('state', e.target.value)}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>District *</label>
                  <input className={inputCls} placeholder="e.g. Solapur" value={form.district} onChange={e => set('district', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Taluk *</label>
                  <input className={inputCls} placeholder="e.g. Barshi" value={form.taluk} onChange={e => set('taluk', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Village *</label>
                  <input className={inputCls} placeholder="e.g. Barad" value={form.village} onChange={e => set('village', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Survey Number *</label>
                  <input className={inputCls} placeholder="e.g. 145/1" value={form.survey_number} onChange={e => set('survey_number', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Land Area (Acres)</label>
                <input type="number" step="0.01" min="0" className={inputCls} placeholder="e.g. 2.5" value={form.land_area_acres} onChange={e => set('land_area_acres', e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls + ' mb-0'}>GPS Coordinates (optional — improves satellite accuracy)</label>
                  <button
                    onClick={handleLocate}
                    className="flex items-center gap-1 text-xs text-[#016B4B] font-semibold hover:text-[#015138] transition-colors"
                  >
                    <MapPin className="w-3 h-3" /> Use my location
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} placeholder="Latitude" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                  <input className={inputCls} placeholder="Longitude" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>Primary Crop</label>
                <select className={inputCls} value={form.declared_crop} onChange={e => set('declared_crop', e.target.value)}>
                  <option value="">-- Select Crop --</option>
                  {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Season</label>
                  <select className={inputCls} value={form.season} onChange={e => set('season', e.target.value)}>
                    {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sowing Date</label>
                  <input type="date" className={inputCls} value={form.sowing_date} onChange={e => set('sowing_date', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="multi-crop"
                  checked={form.has_multiple_crops}
                  onChange={e => set('has_multiple_crops', e.target.checked)}
                  className="accent-[#016B4B] w-4 h-4 rounded"
                />
                <label htmlFor="multi-crop" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Has intercropping / multiple crops
                </label>
              </div>
              {form.has_multiple_crops && (
                <div>
                  <label className={labelCls}>Secondary Crop</label>
                  <select className={inputCls} value={form.secondary_crop} onChange={e => set('secondary_crop', e.target.value)}>
                    <option value="">-- Select Secondary Crop --</option>
                    {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          {step === 2 ? (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || success}
                className="flex items-center gap-2 bg-[#016B4B] hover:bg-[#015138] disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Adding...' : 'Add Land Holding'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!form.district || !form.taluk || !form.village || !form.survey_number) {
                    setError('District, Taluk, Village and Survey Number are required.');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="bg-[#016B4B] hover:bg-[#015138] text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                Next →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
