import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Droplets, Sun, CloudRain, Bug, Flame, Wind, Check, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import GovButton from '../ui/GovButton';
import { farmerApi } from '../../api/farmer';
import { useAuth } from '../../auth/AuthContext';

interface ClaimRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  land: { udlrn?: string; landAreaHa?: number; declaredCrop?: string; district?: string; state?: string; season?: string } | null;
  onSuccess: () => void;
}

const DAMAGE_TYPES = [
  { id: 'FLOOD', label: 'Flood', icon: CloudRain, color: 'from-blue-500 to-blue-700' },
  { id: 'DROUGHT', label: 'Drought', icon: Sun, color: 'from-amber-500 to-amber-700' },
  { id: 'HAILSTORM', label: 'Hailstorm', icon: Wind, color: 'from-gray-400 to-gray-600' },
  { id: 'PEST', label: 'Pest Attack', icon: Bug, color: 'from-green-600 to-green-800' },
  { id: 'FIRE', label: 'Fire', icon: Flame, color: 'from-red-500 to-red-700' },
  { id: 'CYCLONE', label: 'Cyclone', icon: Wind, color: 'from-purple-500 to-purple-700' },
];

export default function ClaimRegistrationModal({ isOpen, onClose, land, onSuccess }: ClaimRegistrationModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [damageType, setDamageType] = useState('');
  const [damagePercent, setDamagePercent] = useState(50);
  const [damageDate, setDamageDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ claimNumber: string } | null>(null);

  const reset = () => {
    setStep(1);
    setConfirmed(false);
    setDamageType('');
    setDamagePercent(50);
    setDamageDate('');
    setDescription('');
    setSuccessData(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getDamageColor = (pct: number) => {
    if (pct <= 30) return 'text-green-600';
    if (pct <= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleSubmit = async () => {
    if (!land?.udlrn) {
      toast.error('Land data not available');
      return;
    }
    setLoading(true);
    try {
      const response = await farmerApi.fileClaim({
        udlrn: land.udlrn,
        damageCause: damageType,
        damagePercent,
        damageDate,
        description: description || undefined,
      });
      const data = response.data?.data || response.data;
      setSuccessData({ claimNumber: data.claimNumber });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors"
          >
            <X size={20} />
          </button>

          {successData ? (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle size={48} className="text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-black text-[#1a1a1a] mb-2">Claim Registered!</h2>
              <p className="text-[14px] text-[#6b7280] mb-4">
                Your claim has been submitted for processing.
              </p>
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 mb-6">
                <p className="text-[11px] font-bold text-[#1a6b3c] uppercase tracking-wider mb-1">Claim Number</p>
                <p className="text-xl font-mono font-black text-[#1a1a1a]">{successData.claimNumber}</p>
              </div>
              <div className="bg-[#fefce8] border border-[#fef08a] rounded-lg p-3 mb-6 text-left">
                <p className="text-[12px] text-[#854d0e]">
                  Our AI will analyze satellite data for your land and provide a verdict within seconds.
                  You will receive a notification with the result.
                </p>
              </div>
              <div className="flex gap-3">
                <GovButton variant="outline" fullWidth onClick={handleClose}>
                  Back to Dashboard
                </GovButton>
                <GovButton variant="primary" fullWidth onClick={() => { reset(); onSuccess(); handleClose(); }}>
                  View My Claims
                </GovButton>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-[#f3f4f6]">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
                    Step {step} of 3
                  </span>
                  {step > 1 && (
                    <button onClick={() => setStep(step - 1)} className="text-[12px] text-primary font-bold hover:underline">
                      Back
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        s <= step ? 'bg-primary' : 'bg-[#e5e7eb]'
                      }`}
                    />
                  ))}
                </div>
                <h2 className="text-[18px] font-bold text-[#1a1a1a] mt-3">
                  {step === 1 ? 'Confirm Land Identity' : step === 2 ? 'Damage Information' : 'Review & Submit'}
                </h2>
              </div>

              <div className="p-6">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-[#1a6b3c]" />
                        <span className="text-[12px] font-bold text-[#1a6b3c] uppercase tracking-wider">Your Land Record</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[13px]">
                        <div>
                          <p className="text-[#9ca3af] text-[11px]">UDLRN</p>
                          <p className="font-mono font-bold text-[#1a1a1a]">{land?.udlrn || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[#9ca3af] text-[11px]">Land Area</p>
                          <p className="font-bold text-[#1a1a1a]">{land?.landAreaHa || 0} Ha</p>
                        </div>
                        <div>
                          <p className="text-[#9ca3af] text-[11px]">Declared Crop</p>
                          <p className="font-bold text-[#1a1a1a]">{land?.declaredCrop || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[#9ca3af] text-[11px]">Season</p>
                          <p className="font-bold text-[#1a1a1a]">{land?.season || 'Kharif 2026'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[#9ca3af] text-[11px]">Location</p>
                          <p className="font-bold text-[#1a1a1a]">{land?.district || 'Bengaluru Rural'}, {land?.state || 'Karnataka'}</p>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 p-4 bg-[#f9fafb] rounded-xl cursor-pointer border-2 border-transparent has-[:checked]:border-primary has-[:checked]:bg-[#f0fdf4] transition-all">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-[#d1d5db] text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="text-[14px] font-bold text-[#1a1a1a]">I confirm this is my land</p>
                        <p className="text-[12px] text-[#6b7280]">The above land record is accurate and matches my actual farmland.</p>
                      </div>
                    </label>

                    <GovButton fullWidth size="lg" disabled={!confirmed} onClick={() => setStep(2)}>
                      Next <ChevronRight size={18} />
                    </GovButton>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[12px] font-bold text-[#6b7280] uppercase tracking-wider mb-3">Type of Damage</p>
                      <div className="grid grid-cols-3 gap-2">
                        {DAMAGE_TYPES.map((dt) => {
                          const Icon = dt.icon;
                          return (
                            <button
                              key={dt.id}
                              onClick={() => setDamageType(dt.id)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-[12px] font-bold ${
                                damageType === dt.id
                                  ? `border-primary bg-gradient-to-br ${dt.color} text-white shadow-md`
                                  : 'border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db]'
                              }`}
                            >
                              <Icon size={24} />
                              {dt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[12px] font-bold text-[#6b7280] uppercase tracking-wider">Estimated Damage %</p>
                        <span className={`text-2xl font-black ${getDamageColor(damagePercent)}`}>{damagePercent}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={damagePercent}
                        onChange={(e) => setDamagePercent(Number(e.target.value))}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-primary"
                        style={{
                          background: `linear-gradient(to right, ${damagePercent <= 30 ? '#22c55e' : damagePercent <= 60 ? '#f59e0b' : '#ef4444'} 0%, #e5e7eb 0%)`,
                        }}
                      />
                      <p className="text-[11px] text-[#9ca3af] mt-1">How much of your crop was damaged?</p>
                    </div>

                    <div>
                      <p className="text-[12px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">Date Damage Occurred</p>
                      <input
                        type="date"
                        value={damageDate}
                        onChange={(e) => setDamageDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>

                    <div>
                      <p className="text-[12px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">Description (optional)</p>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                        maxLength={200}
                        rows={3}
                        placeholder="Describe what happened to your crops..."
                        className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                      <p className="text-[11px] text-[#9ca3af] text-right">{description.length}/200</p>
                    </div>

                    <GovButton
                      fullWidth
                      size="lg"
                      disabled={!damageType || !damageDate}
                      onClick={() => setStep(3)}
                    >
                      Review <ChevronRight size={18} />
                    </GovButton>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="bg-[#f9fafb] rounded-xl p-4 space-y-2">
                      {[
                        ['UDLRN', land?.udlrn],
                        ['Crop', land?.declaredCrop],
                        ['Land Area', `${land?.landAreaHa || 0} Ha`],
                        ['Damage Type', damageType],
                        ['Damage %', `${damagePercent}%`],
                        ['Date', damageDate || 'N/A'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-[13px]">
                          <span className="text-[#9ca3af]">{label}</span>
                          <span className="font-bold text-[#1a1a1a]">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#fefce8] border border-[#fef08a] rounded-xl p-4 text-left">
                      <p className="text-[12px] text-[#854d0e] font-medium">
                        Our AI will analyze satellite data for your land and provide a verdict within seconds.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 p-4 bg-[#fef2f2] rounded-xl cursor-pointer border border-[#fecaca]">
                      <input
                        type="checkbox"
                        id="declaration"
                        className="mt-1 w-5 h-5 rounded border-[#d1d5db] text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="text-[13px] font-bold text-[#1a1a1a]">
                          I declare the information is true and correct.
                        </p>
                        <p className="text-[11px] text-[#b91c1c] mt-1">
                          I understand that false claims are punishable under IPC Section 420.
                        </p>
                      </div>
                    </label>

                    <div className="flex gap-3">
                      <GovButton variant="outline" size="lg" fullWidth onClick={() => setStep(2)}>
                        <ChevronLeft size={18} /> Edit
                      </GovButton>
                      <GovButton variant="primary" size="lg" fullWidth loading={loading} onClick={handleSubmit}>
                        Submit Claim
                      </GovButton>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}