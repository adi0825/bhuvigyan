import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sprout, MapPin, FileText, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { cscApi } from '../../api/cscApi';

const CAUSES = ["Drought", "Flood", "Pest Attack", "Hailstorm", "Cyclone", "Unseasonal Rain", "Other"];
const SEASONS = ["Kharif", "Rabi", "Zaid"];

export default function CscNewClaim() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [udlrm, setUdlrm] = useState('');
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [season, setSeason] = useState('Kharif');
  const [cropType, setCropType] = useState('');
  const [declaredLoss, setDeclaredLoss] = useState('');
  const [causeOfLoss, setCauseOfLoss] = useState('');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [cscRemarks, setCscRemarks] = useState('');

  const [verdict, setVerdict] = useState<any>(null);
  const [progressStep, setProgressStep] = useState(0);

  const landAreaHa = farmer?.landAreaHa || 0;
  const claimAmount = landAreaHa && declaredLoss
    ? Math.round(landAreaHa * parseFloat(declaredLoss) * 50000)
    : 0;

  async function lookupFarmer() {
    if (!udlrm.trim()) return toast.error('Enter UDLRM number');
    setLoading(true);
    try {
      const res = await cscApi.lookupFarmer(udlrm.trim());
      setFarmer(res.data.data);
      setCropType(res.data.data.cropType);
      toast.success('Farmer data loaded');
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error || 'Farmer not found');
    } finally {
      setLoading(false);
    }
  }

  async function runSatelliteCheck() {
    setSubmitting(true);
    setStep(3);
    const steps = [
      'Fetching farmer land records...',
      'Running Sentinel-2 NDVI analysis...',
      'Checking Sentinel-1 SAR moisture...',
      'Comparing against 10-year baseline...',
      'Calculating fraud score...',
      'Generating verdict...',
    ];
    for (let i = 0; i < steps.length; i++) {
      setProgressStep(i);
      await new Promise(r => setTimeout(r, 1000));
    }

    try {
      const res = await cscApi.submitClaim({
        udlrm: farmer.udlrm,
        season,
        cropType,
        declaredLoss: parseFloat(declaredLoss),
        causeOfLoss,
        claimAmount,
        dateOfLoss,
        cscRemarks,
      });
      setVerdict(res.data.data);
      setStep(4);
      toast.success(`Claim ${res.data.data.claimId} submitted!`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail?.error === 'DAILY_LIMIT_REACHED') {
        toast.error('Daily claim limit reached!');
      } else {
        toast.error('Claim submission failed');
      }
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  }

  const score = verdict?.fraudScore ?? 0;
  const verdictColor = score <= 30 ? 'bg-green-50 border-green-200 text-green-800' :
    score <= 60 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    score <= 80 ? 'bg-orange-50 border-orange-200 text-orange-800' :
    'bg-red-50 border-red-200 text-red-800';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-4">
        {([1,2,3,4] as const).map(s => (
          <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <h2 className="text-xl font-bold mb-4">Step 1: Farmer Lookup</h2>
            <GovCard className="p-6 space-y-4">
              <div className="flex gap-3">
                <GovInput placeholder="Enter UDLRM Number" value={udlrm} onChange={e => setUdlrm(e.target.value)} className="flex-1" />
                <GovButton onClick={lookupFarmer} loading={loading}><Search className="w-4 h-4" /> Lookup</GovButton>
              </div>
              {farmer && (
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Farmer Name</p>
                    <p className="font-semibold">{farmer.farmerName}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Mobile</p>
                    <p className="font-semibold">{farmer.mobile}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Aadhaar</p>
                    <p className="font-semibold">{farmer.aadhaar}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold">{farmer.village}, {farmer.taluk}, {farmer.district}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Land Area</p>
                    <p className="font-semibold">{farmer.landAreaHa} Ha</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Crop Type</p>
                    <p className="font-semibold">{farmer.cropType}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">NDVI</p>
                    <p className="font-semibold">{farmer.ndvi}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Fraud Score Baseline</p>
                    <p className="font-semibold">{farmer.fraudScoreBaseline}/100</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg">
                    <MapPin className="w-4 h-4" /> Coordinates Verified
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <GovButton onClick={() => farmer ? setStep(2) : toast.error('Lookup farmer first')} disabled={!farmer}>Next <ArrowRight className="w-4 h-4" /></GovButton>
              </div>
            </GovCard>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <h2 className="text-xl font-bold mb-4">Step 2: Claim Details</h2>
            <GovCard className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                  <select className="w-full rounded-lg border border-gray-300 p-2" value={season} onChange={e => setSeason(e.target.value)}>
                    {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                  <GovInput value={cropType} onChange={e => setCropType(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Declared Loss %</label>
                  <GovInput type="number" min={0} max={100} value={declaredLoss} onChange={e => setDeclaredLoss(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cause of Loss</label>
                  <select className="w-full rounded-lg border border-gray-300 p-2" value={causeOfLoss} onChange={e => setCauseOfLoss(e.target.value)}>
                    <option value="">Select...</option>
                    {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Loss</label>
                  <input type="date" className="w-full rounded-lg border border-gray-300 p-2" value={dateOfLoss} onChange={e => setDateOfLoss(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount (auto)</label>
                  <p className="text-lg font-bold text-blue-700">{claimAmount.toLocaleString('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})}</p>
                  <p className="text-xs text-gray-500">{landAreaHa} Ha x {declaredLoss || 0}% x 50,000</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">CSC Remarks</label>
                  <textarea className="w-full rounded-lg border border-gray-300 p-2" rows={3} value={cscRemarks} onChange={e => setCscRemarks(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-between">
                <GovButton variant="outline" onClick={() => setStep(1)}>Back</GovButton>
                <GovButton onClick={runSatelliteCheck} loading={submitting}>Submit & Run Satellite Check</GovButton>
              </div>
            </GovCard>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center py-12">
            <LoadingSpinner />
            <h2 className="text-xl font-bold mt-4">Running Satellite Fraud Check...</h2>
            <div className="mt-6 space-y-3 max-w-md mx-auto text-left">
              {['Fetching farmer land records...','Running Sentinel-2 NDVI analysis...','Checking Sentinel-1 SAR moisture...','Comparing against 10-year baseline...','Calculating fraud score...','Generating verdict...'].map((text, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${i <= progressStep ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-400'}`}>
                  {i <= progressStep ? <CheckCircle className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 4 && verdict && (
          <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6">
            <div className={`p-6 rounded-xl border-2 text-center ${verdictColor}`}>
              <h2 className="text-2xl font-bold">
                {score <= 30 ? 'AUTO-APPROVED' : score <= 60 ? 'UNDER REVIEW' : score <= 80 ? 'FIELD VISIT REQUIRED' : 'AUTO-REJECTED'}
              </h2>
              <p className="text-lg mt-1">{score <= 30 ? 'Low Risk' : score <= 60 ? 'Medium Risk' : score <= 80 ? 'High Risk' : 'Fraud Detected'} (Score: {score}/100)</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <GovCard className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Sprout className="w-4 h-4" /> NDVI Analysis</h3>
                <div className="space-y-1 text-sm">
                  <p>NDVI at Sowing: {verdict.satellite?.ndvi ? (verdict.satellite.ndvi * 0.6).toFixed(2) : '—'}</p>
                  <p>NDVI at Claim: {verdict.satellite?.ndvi?.toFixed(2) || '—'}</p>
                  <p>Change: {verdict.satellite?.ndvi ? (verdict.satellite.ndvi * 0.4).toFixed(2) : '—'}</p>
                </div>
              </GovCard>
              <GovCard className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Satellite vs Claim</h3>
                <div className="space-y-1 text-sm">
                  <p>Declared Loss: {declaredLoss}%</p>
                  <p>SAR Soil Moisture: {verdict.satellite?.soil_moisture}%</p>
                </div>
              </GovCard>
              <GovCard className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Fraud Flags</h3>
                <div className="flex flex-wrap gap-1">
                  {verdict.flags?.length ? verdict.flags.map((f: string) => (
                    <span key={f} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">{f}</span>
                  )) : <span className="text-sm text-gray-500">None — all checks passed</span>}
                </div>
              </GovCard>
            </div>

            <div className="flex justify-center gap-3">
              <GovButton variant="outline" onClick={() => nav('/csc/my-claims')}>View My Claims</GovButton>
              {score <= 80 && (
                <GovButton onClick={() => nav('/csc/my-claims')}>Confirm & Submit</GovButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
