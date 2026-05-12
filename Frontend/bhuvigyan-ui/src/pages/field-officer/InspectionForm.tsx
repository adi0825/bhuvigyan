import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, CheckCircle, Camera, MapPin, Ruler,
  Sprout, ThermometerSun, AlertTriangle, Save, Send,
  ChevronRight, ChevronLeft, ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import PageTransition from '../../components/ui/PageTransition';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useVisitDetail, useInspectionSubmit } from '../../hooks/useOfficerData';
import type { ChecklistItem, InspectionFormData, Recommendation } from '../../types';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: 'Verified farmer identity with Aadhaar', checked: false },
  { label: 'Cross-checked UDLRN with land records', checked: false },
  { label: 'Photographed all 4 corners of plot', checked: false },
  { label: 'GPS location captured at center of plot', checked: false },
  { label: 'Measured affected area with GPS walk', checked: false },
  { label: 'Collected soil/moisture sample (if required)', checked: false },
  { label: 'Spoke with neighboring farmers', checked: false },
  { label: 'Weather data verified from local source', checked: false },
];

const DAMAGE_CAUSES = ['DROUGHT', 'FLOOD', 'HAILSTORM', 'PEST_ATTACK', 'FIRE', 'WIND_STORM', 'FROST', 'OTHER'];
const RECOMMENDATIONS: { value: Recommendation; label: string; color: string }[] = [
  { value: 'APPROVE', label: 'Approve Claim', color: 'bg-green-600 hover:bg-green-700' },
  { value: 'REJECT', label: 'Reject Claim', color: 'bg-red-600 hover:bg-red-700' },
  { value: 'REVIEW', label: 'Send for Review', color: 'bg-blue-600 hover:bg-blue-700' },
];

export default function InspectionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { visit, loading } = useVisitDetail(id);
  const { submitting, submitted, error, submit } = useInspectionSubmit();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState<InspectionFormData>({
    cropFound: '',
    cropMatch: true,
    yieldEstimate: undefined,
    damagePercent: 0,
    damageCause: 'DROUGHT',
    areaVisitedHa: 0,
    remarks: '',
    recommendation: 'REVIEW',
    checklist: [...DEFAULT_CHECKLIST],
  });

  const [photos, setPhotos] = useState<{ url: string; type: string }[]>([]);

  const update = <K extends keyof InspectionFormData>(key: K, value: InspectionFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleChecklist = (idx: number) => {
    const next = [...form.checklist];
    next[idx] = { ...next[idx], checked: !next[idx].checked };
    update('checklist', next);
  };

  const handlePhotoCapture = () => {
    // Simulated photo capture for demo
    const mockUrl = `/images/crop-field.jpg?ts=${Date.now()}`;
    setPhotos(prev => [...prev, { url: mockUrl, type: 'FIELD_PHOTO' }]);
    toast.success('Photo captured');
  };

  const handleSubmit = async () => {
    if (!id) return;
    if (form.damagePercent < 0 || form.damagePercent > 100) {
      toast.error('Damage percentage must be between 0 and 100');
      return;
    }
    if (form.areaVisitedHa <= 0) {
      toast.error('Area visited must be greater than 0');
      return;
    }
    await submit(id, form);
    if (!error) {
      toast.success('Inspection submitted successfully');
      navigate(`/field/visit/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (submitted) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto text-center py-20">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">Inspection Submitted</h1>
          <p className="text-gray-500 mb-8">Visit {visit?.visitNumber} has been completed and the claim has been updated.</p>
          <GovButton onClick={() => navigate('/field/dashboard')}>
            Return to Dashboard
          </GovButton>
        </div>
      </PageTransition>
    );
  }

  const stepLabels = ['GPS & Photos', 'Crop Assessment', 'Damage Evaluation', 'Review & Submit'];

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <GovButton variant="outline" size="sm" onClick={() => navigate(`/field/visit/${id}`)}>
            <ArrowLeft size={16} />
          </GovButton>
          <div>
            <h1 className="text-xl font-extrabold text-[#1a1a1a]">Field Inspection</h1>
            <p className="text-sm text-gray-500">{visit?.claimNumber} | {visit?.farmer?.fullName}</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stepLabels.map((label, idx) => {
            const num = idx + 1;
            const active = num === step;
            const done = num < step;
            return (
              <div key={num} className="flex items-center gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-green-600 text-white' : active ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {done ? <CheckCircle size={14} /> : num}
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${active ? 'text-primary' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {num < 4 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GovCard>
                <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-primary" /> Step 1: GPS Verification & Photos
                </h2>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-bold text-blue-800 mb-1">GPS Status</p>
                    <p className="text-sm text-blue-600">
                      {visit?.gpsMatch
                        ? `Verified — within ${visit.distanceMeters}m of land boundary`
                        : 'GPS verification required. Ensure you are at the center of the plot.'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                      <Camera size={16} /> Capture Geotagged Photos
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photos.map((p, i) => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <button
                        onClick={handlePhotoCapture}
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-blue-50 transition-colors"
                      >
                        <Camera size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Add Photo</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Minimum 4 photos recommended (all corners + center)</p>
                  </div>
                </div>
              </GovCard>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GovCard>
                <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <Sprout size={18} className="text-primary" /> Step 2: Crop Assessment
                </h2>
                <div className="space-y-5">
                  <GovInput
                    label="Crop Found at Site"
                    value={form.cropFound}
                    onChange={e => update('cropFound', e.target.value)}
                    placeholder="e.g. Paddy (MTU-1010)"
                    helperText={`Declared crop: ${visit?.declaredCrop || 'N/A'}`}
                  />

                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a] mb-2">Does the crop match the declared crop?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => update('cropMatch', true)}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${form.cropMatch ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        Yes, Match
                      </button>
                      <button
                        onClick={() => update('cropMatch', false)}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${!form.cropMatch ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        No, Mismatch
                      </button>
                    </div>
                  </div>

                  <GovInput
                    label="Yield Estimate (kg/ha)"
                    type="number"
                    value={form.yieldEstimate ?? ''}
                    onChange={e => update('yieldEstimate', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                  />
                </div>
              </GovCard>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GovCard>
                <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <ThermometerSun size={18} className="text-primary" /> Step 3: Damage Evaluation
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-bold text-[#1a1a1a] block mb-2">
                      Damage Percentage: <span className="text-primary">{form.damagePercent}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={form.damagePercent}
                      onChange={e => update('damagePercent', Number(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a] mb-2">Cause of Damage</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DAMAGE_CAUSES.map(cause => (
                        <button
                          key={cause}
                          onClick={() => update('damageCause', cause)}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${form.damageCause === cause ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          {cause.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <GovInput
                    label="Area Visited (hectares)"
                    type="number"
                    value={form.areaVisitedHa || ''}
                    onChange={e => update('areaVisitedHa', Number(e.target.value))}
                    placeholder={`Declared area: ${visit?.landAreaHa ?? 'N/A'} ha`}
                  />

                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                      <ClipboardCheck size={16} /> Inspection Checklist
                    </p>
                    <div className="space-y-2">
                      {form.checklist.map((item, idx) => (
                        <label key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleChecklist(idx)}
                            className="mt-0.5 w-5 h-5 accent-primary shrink-0"
                          />
                          <span className={`text-sm ${item.checked ? 'text-gray-700 line-through' : 'text-gray-800'}`}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </GovCard>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GovCard>
                <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <Send size={18} className="text-primary" /> Step 4: Review & Submit
                </h2>
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                    <p><strong>Crop Found:</strong> {form.cropFound || 'Not specified'}</p>
                    <p><strong>Crop Match:</strong> {form.cropMatch ? 'Yes' : 'No'}</p>
                    <p><strong>Damage:</strong> {form.damagePercent}% — {form.damageCause.replace('_', ' ')}</p>
                    <p><strong>Area Visited:</strong> {form.areaVisitedHa} ha</p>
                    <p><strong>Photos:</strong> {photos.length} captured</p>
                    <p><strong>Checklist:</strong> {form.checklist.filter(c => c.checked).length}/{form.checklist.length} completed</p>
                  </div>

                  <div>
                    <GovInput
                      label="Inspector Remarks"
                      multiline
                      rows={4}
                      value={form.remarks}
                      onChange={e => update('remarks', e.target.value)}
                      placeholder="Detailed observations from the field..."
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a] mb-3">Recommendation</p>
                    <div className="grid gap-3">
                      {RECOMMENDATIONS.map(rec => (
                        <button
                          key={rec.value}
                          onClick={() => update('recommendation', rec.value)}
                          className={`py-3 px-4 rounded-xl text-white font-bold text-sm transition-all ${form.recommendation === rec.value ? rec.color + ' ring-2 ring-offset-2 ring-gray-300' : 'bg-gray-300 hover:bg-gray-400'}`}
                        >
                          {rec.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GovCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <GovButton
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft size={16} /> Previous
          </GovButton>

          {step < 4 ? (
            <GovButton variant="primary" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={16} />
            </GovButton>
          ) : (
            <GovButton
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Inspection'}
            </GovButton>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
