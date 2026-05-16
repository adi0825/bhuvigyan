import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock, Lock, Unlock, Sprout, ArrowRight, Info } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface InsurancePlan {
  planId: string;
  planName: string;
  cropType: string;
  premium: number;
  sumInsured: number;
  durationMonths: number;
  waitingPeriodDays: number;
  claimConditions: string;
  eligibilityRules: string;
  coverageType: string;
  eligibleCrops: string[];
}

interface PolicyStatus {
  hasActivePolicy: boolean;
  activePolicy: {
    policyNumber: string;
    planName: string;
    startDate: string;
    endDate: string;
    coverageAmount: number;
    premiumPaid: number;
  } | null;
  latestApplication: {
    applicationId: string;
    planName: string;
    status: string;
    submittedAt: string;
    rejectionReason: string | null;
  } | null;
}

export default function FarmerInsurance() {
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [status, setStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [udlrn, setUdlrn] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [cropType, setCropType] = useState('');
  const [landArea, setLandArea] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const planRes = await api.get('/farmer/insurance/plans');
      if (planRes.data?.success) setPlans(planRes.data.data || []);
      const profileRes = await api.get('/farmer/land');
      const udl = profileRes.data?.data?.udlrn || '';
      setUdlrn(udl);
      if (udl) {
        const statusRes = await api.get(`/farmer/insurance/status/${udl}`);
        if (statusRes.data?.success) setStatus(statusRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!selectedPlan || !udlrn) return;
    try {
      const res = await api.post('/farmer/insurance/apply', {
        planId: selectedPlan.planId,
        cropType: cropType || selectedPlan.cropType,
        landAreaHa: parseFloat(landArea) || 0,
      });
      if (res.data?.success) {
        toast.success('Policy application submitted!');
        setShowApplyForm(false);
        setSelectedPlan(null);
        loadData();
      } else {
        toast.error(res.data?.error?.message || 'Failed to apply');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Error submitting application');
    }
  }

  const statusColor = (s?: string) => {
    if (!s) return 'bg-gray-100 text-gray-600';
    if (s === 'ACTIVE') return 'bg-green-100 text-green-700';
    if (s === 'PENDING') return 'bg-yellow-100 text-yellow-700';
    if (s === 'APPROVED') return 'bg-blue-100 text-blue-700';
    if (s === 'REJECTED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#016B4B]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#111827]">My Insurance</h1>

      {/* Status Banner */}
      {status?.hasActivePolicy && status.activePolicy && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Active Policy: {status.activePolicy.policyNumber}</p>
            <p className="text-sm text-green-700">{status.activePolicy.planName} · Coverage: ₹{status.activePolicy.coverageAmount?.toLocaleString()} · Valid until {status.activePolicy.endDate}</p>
            <p className="text-sm text-green-600 mt-1">You can now file claims from the Claims tab.</p>
          </div>
        </div>
      )}

      {status?.latestApplication && !status.hasActivePolicy && (
        <div className={`border rounded-xl p-4 flex items-start gap-3 ${statusColor(status.latestApplication.status)}`}>
          {status.latestApplication.status === 'PENDING' ? <Clock className="w-5 h-5 mt-0.5 shrink-0" />
            : status.latestApplication.status === 'REJECTED' ? <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
            : <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />}
          <div>
            <p className="font-semibold">Application {status.latestApplication.status}: {status.latestApplication.applicationId}</p>
            <p className="text-sm">Plan: {status.latestApplication.planName} · Submitted: {new Date(status.latestApplication.submittedAt).toLocaleDateString()}</p>
            {status.latestApplication.rejectionReason && (
              <p className="text-sm mt-1">Reason: {status.latestApplication.rejectionReason}</p>
            )}
          </div>
        </div>
      )}

      {!status?.hasActivePolicy && !status?.latestApplication && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">No Insurance Policy</p>
            <p className="text-sm text-amber-700">You must buy an active insurance policy before you can file a claim. Select a plan below to apply.</p>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="text-lg font-semibold text-[#111827] mb-3">Available Insurance Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.planId} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-[#016B4B]" />
                <h3 className="font-bold text-[#111827]">{plan.planName}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-2">{plan.coverageType} · {plan.cropType}</p>
              <div className="space-y-1 text-sm text-gray-700 mb-3">
                <p><span className="text-gray-500">Premium:</span> ₹{plan.premium.toLocaleString()}</p>
                <p><span className="text-gray-500">Sum Insured:</span> ₹{plan.sumInsured.toLocaleString()}</p>
                <p><span className="text-gray-500">Duration:</span> {plan.durationMonths} months</p>
                <p><span className="text-gray-500">Waiting Period:</span> {plan.waitingPeriodDays} days</p>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                <p className="font-medium text-gray-600">Eligible Crops:</p>
                <p>{plan.eligibleCrops.join(', ')}</p>
              </div>
              <button
                onClick={() => { setSelectedPlan(plan); setCropType(''); setLandArea(''); setShowApplyForm(true); }}
                disabled={!!(status?.hasActivePolicy)}
                className="w-full py-2 rounded-lg text-sm font-medium bg-[#016B4B] text-white hover:bg-[#014d36] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {status?.hasActivePolicy ? 'Policy Already Active' : 'Apply for Policy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Form Modal */}
      {showApplyForm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-1">Apply for {selectedPlan.planName}</h3>
            <p className="text-sm text-gray-500 mb-4">Premium: ₹{selectedPlan.premium.toLocaleString()} · Sum Insured: ₹{selectedPlan.sumInsured.toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                <input
                  type="text"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder={selectedPlan.cropType}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#016B4B] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land Area (Ha)</label>
                <input
                  type="number"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="Enter land area"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#016B4B] focus:outline-none"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <p><strong>Claim Conditions:</strong> {selectedPlan.claimConditions}</p>
                <p className="mt-1"><strong>Eligibility:</strong> {selectedPlan.eligibilityRules}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowApplyForm(false)} className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleApply} className="flex-1 py-2 rounded-lg text-sm font-medium bg-[#016B4B] text-white hover:bg-[#014d36]">Submit Application</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
