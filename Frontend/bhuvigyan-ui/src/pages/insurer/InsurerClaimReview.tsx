import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Search, AlertTriangle, MapPin, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { insurerApi } from '../../api/insurerApi';

const REJECTION_REASONS = [
  'Fraud Detected',
  'NDVI Contradiction',
  'Non-Agricultural Land',
  'Insufficient Evidence',
  'Duplicate Claim',
  'Other',
];

export default function InsurerClaimReview() {
  const { claimId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'approve'|'reject'|'field'|null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!claimId) return;
    insurerApi.getClaim(claimId).then(res => {
      setData(res.data.data);
      setApprovedAmount(String(res.data.data.claim.claimAmount || 0));
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load claim');
      setLoading(false);
    });
  }, [claimId]);

  async function submitDecision() {
    if (!officerNotes.trim()) return toast.error('Officer notes are required');
    setSubmitting(true);
    try {
      if (action === 'approve') {
        await insurerApi.approveClaim({ claimId: claimId!, approvedAmount: parseFloat(approvedAmount), officerNotes });
        toast.success('Claim approved and payout initiated');
      } else if (action === 'reject') {
        await insurerApi.rejectClaim({ claimId: claimId!, rejectionReason, officerNotes });
        toast.success('Claim rejected');
      } else if (action === 'field') {
        await insurerApi.fieldVisit({ claimId: claimId!, assignedOfficer, officerNotes });
        toast.success('Field visit assigned');
      }
      nav('/insurer/claims');
    } catch {
      toast.error('Action failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="p-8 text-center text-gray-500">Claim not found</div>;

  const { claim, farmer, fraudAlerts } = data;
  const score = claim.fraudScore;
  const verdictColor = score <= 30 ? 'bg-green-50 border-green-200 text-green-800' :
    score <= 60 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    score <= 80 ? 'bg-orange-50 border-orange-200 text-orange-800' :
    'bg-red-50 border-red-200 text-red-800';

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Review Claim: {claim.claimId}</h2>

      <div className={`p-4 rounded-xl border-2 text-center ${verdictColor}`}>
        <h3 className="text-lg font-bold">
          {score <= 30 ? 'AUTO-APPROVED — Low Risk' : score <= 60 ? 'UNDER REVIEW — Medium Risk' : score <= 80 ? 'FIELD VISIT REQUIRED — High Risk' : 'AUTO-REJECTED — Fraud Detected'}
        </h3>
        <p>Fraud Score: {score}/100</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GovCard className="p-5 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Claim & Farmer Summary</h3>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Farmer:</span> {claim.farmerName}</p>
            <p><span className="text-gray-500">UDLRM:</span> {claim.udlrm}</p>
            <p><span className="text-gray-500">Mobile:</span> {farmer.mobile}</p>
            <p><span className="text-gray-500">Location:</span> {claim.district}, {claim.state}</p>
            <p><span className="text-gray-500">Land Area:</span> {farmer.landAreaHa} Ha</p>
            <p><span className="text-gray-500">Crop:</span> {claim.cropType}</p>
            <p><span className="text-gray-500">Declared Loss:</span> {claim.declaredLoss}%</p>
            <p><span className="text-gray-500">Claim Amount:</span> ₹{claim.claimAmount?.toLocaleString()}</p>
            <p><span className="text-gray-500">Cause:</span> {claim.causeOfLoss}</p>
            <p><span className="text-gray-500">CSC Operator:</span> {claim.cscOperator}</p>
          </div>
        </GovCard>

        <GovCard className="p-5 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Satellite Evidence</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="text-xs text-gray-500">NDVI at Sowing</p>
              <p className="font-bold">{claim.ndviAtSowing ?? '—'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="text-xs text-gray-500">NDVI at Claim</p>
              <p className="font-bold">{claim.ndviAtClaim ?? '—'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="text-xs text-gray-500">Soil Moisture</p>
              <p className="font-bold">{claim.soilMoistureAtClaim ?? '—'}%</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {claim.fraudFlags?.map((f: string) => (
              <span key={f} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">{f}</span>
            )) || <span className="text-sm text-gray-500">No flags</span>}
          </div>
          {fraudAlerts?.length > 0 && (
            <div className="space-y-1">
              {fraudAlerts.map((a: any) => (
                <div key={a.alertId} className="text-xs bg-orange-50 p-2 rounded">{a.type}: {a.description}</div>
              ))}
            </div>
          )}
        </GovCard>
      </div>

      {claim.auditTrail?.length > 0 && (
        <GovCard className="p-5">
          <h3 className="font-bold mb-3">Audit Trail</h3>
          <div className="space-y-2">
            {claim.auditTrail.map((entry: any, i: number) => (
              <div key={i} className="flex gap-3 text-sm border-l-2 border-blue-200 pl-3 py-1">
                <span className="text-gray-500 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                <span className="font-medium">{entry.action}</span>
                <span className="text-gray-600">{entry.notes}</span>
              </div>
            ))}
          </div>
        </GovCard>
      )}

      <GovCard className="p-5 space-y-4">
        <h3 className="font-bold">Decision Panel</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Officer Notes <span className="text-red-500">*</span></label>
          <textarea className="w-full rounded-lg border border-gray-300 p-2" rows={3} value={officerNotes} onChange={e => setOfficerNotes(e.target.value)} />
        </div>

        {!action && (
          <div className="flex flex-wrap gap-3">
            <GovButton variant="primary" onClick={() => setAction('approve')}><CheckCircle className="w-4 h-4" /> Approve & Initiate Payout</GovButton>
            <GovButton variant="warning" onClick={() => setAction('field')}><Search className="w-4 h-4" /> Send for Field Visit</GovButton>
            <GovButton variant="danger" onClick={() => setAction('reject')}><XCircle className="w-4 h-4" /> Reject Claim</GovButton>
          </div>
        )}

        {action === 'approve' && (
          <div className="space-y-3">
            <GovInput label="Final Approved Amount (₹)" type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} />
            <div className="flex gap-3">
              <GovButton variant="outline" onClick={() => setAction(null)}>Cancel</GovButton>
              <GovButton onClick={submitDecision} loading={submitting}>Confirm Approval</GovButton>
            </div>
          </div>
        )}

        {action === 'reject' && (
          <div className="space-y-3">
            <select className="w-full rounded-lg border border-gray-300 p-2" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}>
              <option value="">Select rejection reason...</option>
              {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-3">
              <GovButton variant="outline" onClick={() => setAction(null)}>Cancel</GovButton>
              <GovButton variant="danger" onClick={submitDecision} loading={submitting}>Confirm Rejection</GovButton>
            </div>
          </div>
        )}

        {action === 'field' && (
          <div className="space-y-3">
            <GovInput label="Assign Field Officer" value={assignedOfficer} onChange={e => setAssignedOfficer(e.target.value)} />
            <div className="flex gap-3">
              <GovButton variant="outline" onClick={() => setAction(null)}>Cancel</GovButton>
              <GovButton variant="warning" onClick={submitDecision} loading={submitting}>Confirm Field Visit</GovButton>
            </div>
          </div>
        )}
      </GovCard>
    </div>
  );
}
