import { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Upload, ShieldCheck, FileText, Image, Camera, Video, Info, Lock } from "lucide-react";
import api from "../../api/axios";
import GovButton from "../../components/ui/GovButton";
import toast from "react-hot-toast";

const CALAMITY_TYPES = ["Drought", "Excess Rainfall", "Flood", "Cyclone", "Hailstorm", "Pest Attack", "Disease", "Fire", "Other"];
const STEPS = [
  { id: 1, title: "Policy", icon: FileText },
  { id: 2, title: "Loss Details", icon: AlertTriangle },
  { id: 3, title: "Documents", icon: FileText },
  { id: 4, title: "Photos & Video", icon: Camera },
  { id: 5, title: "Review & Confirm", icon: ShieldCheck },
  { id: 6, title: "Confirmation", icon: CheckCircle },
];

interface PolicyOption {
  id: string;
  policyNumber: string;
  crop: string;
  insuredArea: number;
  sumInsured: number;
  season: string;
}

const DOC_TYPES = [
  { name: "Insurance Certificate / Policy Document", required: true, format: "PDF/JPG", maxSize: "5MB" },
  { name: "Aadhaar Card", required: true, format: "PDF/JPG", maxSize: "2MB" },
  { name: "RTC / Pahani (Land Record)", required: true, format: "PDF/JPG", maxSize: "5MB" },
  { name: "Sowing Declaration (7/12)", required: true, format: "PDF/JPG", maxSize: "5MB" },
  { name: "Bank Passbook / Cancelled Cheque", required: true, format: "PDF/JPG", maxSize: "2MB" },
  { name: "Geo-tagged Loss Photographs", required: true, format: "JPG/HEIC", maxSize: "10MB each" },
  { name: "IMD / Gram Panchayat Letter", required: false, format: "PDF/JPG", maxSize: "5MB" },
  { name: "Crop Sown Certificate", required: false, format: "PDF/JPG", maxSize: "3MB" },
  { name: "Pesticide Purchase Bill", required: false, format: "PDF/JPG", maxSize: "2MB" },
  { name: "Hospital/Lab Report", required: false, format: "PDF", maxSize: "5MB" },
  { name: "Revenue Officer Letter", required: false, format: "PDF", maxSize: "3MB" },
  { name: "Video Evidence", required: false, format: "MP4", maxSize: "50MB" },
];

export default function CreateClaim() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [claimRef, setClaimRef] = useState("");

  const [form, setForm] = useState({
    policyId: "", lossType: "", damageDate: "", affectedArea: "", estimatedLossPct: "50",
    description: "", delayedReason: "", gpsLat: "", gpsLng: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Record<number, File>>({});
  const [confirmations, setConfirmations] = useState([false, false, false]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [eligibility, setEligibility] = useState<{isEligible: boolean; reason: string} | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    api.get("/farmer/policies").then(r => setPolicies(r.data?.data || [])).catch(() => setPolicies([]));
    api.get("/farmer/land").then(r => {
      const udl = r.data?.data?.udlrn;
      if (udl) {
        return api.get(`/farmer/insurance/eligibility/${udl}`);
      }
      return null;
    }).then((r: any) => {
      if (r?.data?.success) setEligibility(r.data.data);
    }).catch(() => {}).finally(() => setCheckingEligibility(false));
  }, []);

  const selectedPolicy = useMemo(() => policies.find(p => p.id === form.policyId), [policies, form.policyId]);

  const is72HoursExceeded = useMemo(() => {
    if (!form.damageDate) return false;
    const damage = new Date(form.damageDate);
    const now = new Date();
    return (now.getTime() - damage.getTime()) > 72 * 60 * 60 * 1000;
  }, [form.damageDate]);

  const update = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };

  const onPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 15) { toast.error("Maximum 15 photos"); return; }
    setPhotos(p => [...p, ...files]);
    setPreviewUrls(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };
  const removePhoto = (i: number) => { setPhotos(p => p.filter((_, idx) => idx !== i)); setPreviewUrls(p => p.filter((_, idx) => idx !== i)); };

  const onDocUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDocuments(d => ({ ...d, [idx]: file }));
  };

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 1) { if (!form.policyId) e.policyId = "Select a policy"; }
    if (step === 2) {
      if (!form.lossType) e.lossType = "Select calamity type";
      if (!form.damageDate) e.damageDate = "Enter damage date";
      if (is72HoursExceeded && !form.delayedReason) e.delayedReason = "Explain delayed intimation (72h rule)";
      if (!form.affectedArea || parseFloat(form.affectedArea) <= 0) e.affectedArea = "Enter valid area";
      if (!form.description || form.description.length < 50) e.description = "Min 50 characters";
    }
    if (step === 3) {
      const missing = DOC_TYPES.filter((d, i) => d.required && !documents[i]);
      if (missing.length > 0) e.documents = `${missing.length} mandatory documents missing`;
    }
    if (step === 4) { if (photos.length < 3) e.photos = "Minimum 3 geo-tagged photos required"; }
    if (step === 5) { if (!confirmations.every(Boolean)) e.confirmations = "All confirmations required"; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep()) setStep(s => Math.min(6, s + 1)); };
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/farmer/claims", {
        policyId: form.policyId,
        lossType: form.lossType.toUpperCase().replace(/ /g, "_"),
        lossDate: form.damageDate,
        affectedArea: parseFloat(form.affectedArea),
        claimAmount: selectedPolicy ? selectedPolicy.sumInsured * (parseFloat(form.estimatedLossPct) / 100) : 0,
        description: form.description,
        gpsLatitude: form.gpsLat ? parseFloat(form.gpsLat) : null,
        gpsLongitude: form.gpsLng ? parseFloat(form.gpsLng) : null,
      });
      const claimId = res.data.data?.claimId;
      if (claimId) {
        for (const photo of photos) {
          const fd = new FormData(); fd.append("file", photo); fd.append("claimId", claimId);
          await api.post("/evidence", fd, { headers: { "Content-Type": "multipart/form-data" } });
        }
        await api.post(`/claims/${claimId}/submit`);
        setClaimRef(res.data.data?.claimNumber || `BHV-${claimId.slice(0, 8).toUpperCase()}`);
        setStep(6);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to create claim");
    } finally { setSubmitting(false); }
  };

  if (checkingEligibility) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#016B4B]"></div>
      </div>
    );
  }

  if (eligibility && !eligibility.isEligible) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Claim Filing Locked</h2>
          <p className="text-gray-600">{eligibility.reason}</p>
          <div className="flex gap-3 justify-center">
            <GovButton variant="outline" onClick={() => nav("/farmer/dashboard")}>Back to Dashboard</GovButton>
            <GovButton variant="primary" onClick={() => nav("/farmer/insurance")}>Go to My Insurance</GovButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">File New Claim</h1>
      <p className="text-sm text-gray-500 mb-6">PMFBY-compliant 6-step claim process</p>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <Fragment key={s.id}>
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              step === s.id ? 'bg-blue-600 text-white' : step > s.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <s.icon className="w-3.5 h-3.5" /> {s.id}. {s.title}
            </div>
            {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${step > s.id ? 'bg-blue-400' : 'bg-gray-200'}`} />}
          </Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Step 1: Select Policy</h2>
            {policies.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">No active policies found</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    You need an active crop insurance policy to file a claim. Contact your insurer or visit the nearest CSC centre to enrol.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {policies.map(p => (
                  <button key={p.id} onClick={() => update("policyId", p.id)} className={`text-left p-4 rounded-xl border-2 transition-colors ${form.policyId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <p className="font-bold text-gray-900">{p.policyNumber}</p>
                    <p className="text-sm text-gray-600">{p.crop} · {p.season || '—'} · {p.insuredArea} Ha · Sum Insured: ₹{p.sumInsured?.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
            {errors.policyId && <p className="text-red-500 text-xs">{errors.policyId}</p>}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Step 2: Loss Details</h2>
            {selectedPolicy && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Policy: {selectedPolicy.policyNumber} · Insured Area: {selectedPolicy.insuredArea} Ha
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calamity Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {CALAMITY_TYPES.map(c => (
                  <button key={c} onClick={() => update("lossType", c)} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${form.lossType === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{c}</button>
                ))}
              </div>
              {errors.lossType && <p className="text-red-500 text-xs mt-1">{errors.lossType}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Damage Occurrence Date <span className="text-red-500">*</span></label>
              <input type="date" max={new Date().toISOString().split('T')[0]} value={form.damageDate} onChange={e => update("damageDate", e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              {is72HoursExceeded && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 72-Hour Rule Violation</p>
                  <p className="text-red-600 text-xs mt-1">Damage reported more than 72 hours ago. A signed self-declaration is required.</p>
                  <textarea className="mt-2 w-full border border-red-300 rounded-lg px-3 py-2 text-sm" placeholder="Reason for delayed intimation..." value={form.delayedReason} onChange={e => update("delayedReason", e.target.value)} />
                </div>
              )}
              {errors.damageDate && <p className="text-red-500 text-xs mt-1">{errors.damageDate}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Affected Area (Ha) <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" value={form.affectedArea} onChange={e => update("affectedArea", e.target.value)} placeholder={`Max: ${selectedPolicy?.insuredArea || '—'} Ha`} className="w-full border rounded-lg px-3 py-2" />
                {errors.affectedArea && <p className="text-red-500 text-xs mt-1">{errors.affectedArea}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Loss % <span className="text-red-500">*</span></label>
                <input type="range" min="0" max="100" value={form.estimatedLossPct} onChange={e => update("estimatedLossPct", e.target.value)} className="w-full" />
                <p className="text-center font-bold text-blue-600">{form.estimatedLossPct}%</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (min 50 chars) <span className="text-red-500">*</span></label>
              <textarea rows={4} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Describe what happened to your crop..." className="w-full border rounded-lg px-3 py-2" />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">GPS Lat</label><input type="number" step="0.000001" value={form.gpsLat} onChange={e => update("gpsLat", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Auto-capture" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">GPS Lng</label><input type="number" step="0.000001" value={form.gpsLng} onChange={e => update("gpsLng", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Auto-capture" /></div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Step 3: Document Upload</h2>
            <p className="text-sm text-gray-500">Upload all required documents. Mandatory fields must be filled before proceeding.</p>
            <div className="grid gap-3 max-h-[500px] overflow-y-auto">
              {DOC_TYPES.map((doc, i) => (
                <div key={i} className={`p-3 rounded-lg border ${doc.required && !documents[i] ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.name} {doc.required && <span className="text-red-500">*</span>}</p>
                      <p className="text-xs text-gray-500">{doc.format} · Max {doc.maxSize}</p>
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" className="hidden" onChange={e => onDocUpload(i, e)} />
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${documents[i] ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                        <Upload className="w-3 h-3" /> {documents[i] ? 'Uploaded' : 'Upload'}
                      </div>
                    </label>
                  </div>
                  {documents[i] && <p className="text-xs text-green-600 mt-1">{documents[i].name}</p>}
                </div>
              ))}
            </div>
            {errors.documents && <p className="text-red-500 text-sm">{errors.documents}</p>}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Step 4: Photo & Video Evidence</h2>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 inline mr-1" /> Minimum 3 geo-tagged photos required. Photos must be taken within 5km of registered farm.
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <input type="file" accept="image/*" multiple className="hidden" id="photo-input" onChange={onPhotoSelect} />
              <label htmlFor="photo-input" className="cursor-pointer flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="text-blue-600 font-medium">Click to upload photos</span>
                <span className="text-xs text-gray-500">JPG/HEIC, max 10MB each</span>
              </label>
            </div>
            <p className="text-sm font-medium">{photos.length} photos uploaded {photos.length >= 3 && <span className="text-green-600">(minimum met)</span>}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <input type="file" accept="video/mp4" className="hidden" id="video-input" onChange={e => setVideo(e.target.files?.[0] || null)} />
              <label htmlFor="video-input" className="cursor-pointer flex flex-col items-center gap-2">
                <Video className="w-6 h-6 text-gray-400" />
                <span className="text-blue-600 font-medium text-sm">Upload Video (Optional)</span>
                <span className="text-xs text-gray-500">MP4, max 50MB, 2 min max</span>
              </label>
              {video && <p className="text-xs text-green-600 mt-2">{video.name}</p>}
            </div>
            {errors.photos && <p className="text-red-500 text-sm">{errors.photos}</p>}
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Step 5: Review & Confirm</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Policy:</strong> {selectedPolicy?.policyNumber}</p>
              <p><strong>Calamity:</strong> {form.lossType}</p>
              <p><strong>Damage Date:</strong> {form.damageDate}</p>
              <p><strong>Affected Area:</strong> {form.affectedArea} Ha</p>
              <p><strong>Estimated Loss:</strong> {form.estimatedLossPct}%</p>
              <p><strong>Documents:</strong> {Object.keys(documents).length} uploaded</p>
              <p><strong>Photos:</strong> {photos.length} uploaded</p>
            </div>
            <div className="space-y-3 border-t pt-4">
              {[
                "I confirm all information provided is true and accurate",
                "I understand that false claims are punishable under IPC Section 420",
                "I consent to satellite and remote sensing data being used in the assessment",
              ].map((text, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={confirmations[i]} onChange={e => { const c = [...confirmations]; c[i] = e.target.checked; setConfirmations(c); }} className="w-5 h-5 mt-0.5 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">{text}</span>
                </label>
              ))}
            </div>
            {errors.confirmations && <p className="text-red-500 text-sm">{errors.confirmations}</p>}
            <GovButton variant="primary" onClick={submit} disabled={submitting} className="w-full py-3">
              {submitting ? "Submitting..." : "Submit Claim"}
            </GovButton>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div key="s6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Claim Submitted Successfully!</h2>
            <p className="text-lg font-mono font-bold text-blue-600">{claimRef}</p>
            <p className="text-sm text-gray-500">SMS sent to registered mobile</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2">
              <p className="font-medium text-gray-900">What happens next?</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Document Review (48 hours) → Admin</li>
                <li>Satellite Analysis (24 hours) → GEE pipeline</li>
                <li>Fraud Scoring (real-time) → C++ engine</li>
                <li>Field Visit if required (3-7 days)</li>
                <li>Decision (within 15 days)</li>
                <li>Payment (within 7 days of approval)</li>
              </ol>
            </div>
            <GovButton variant="primary" onClick={() => nav("/farmer/dashboard")}>Back to Dashboard</GovButton>
          </motion.div>
        )}
      </AnimatePresence>

      {step < 5 && (
        <div className="flex justify-between mt-6">
          <GovButton variant="outline" onClick={handleBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </GovButton>
          <GovButton variant="primary" onClick={handleNext} disabled={step === 1 && policies.length === 0}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </GovButton>
        </div>
      )}
    </div>
  );
}
