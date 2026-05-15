import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { cscApi } from '../../api/cscApi';

export default function CscClaimDetail() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!claimId) return;
    cscApi.getClaim(claimId).then(res => {
      setClaim(res.data.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load claim');
      setLoading(false);
    });
  }, [claimId]);

  if (loading) return <LoadingSpinner />;
  if (!claim) return <div className="p-8 text-center text-gray-500">Claim not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Claim Detail: {claim.claimId}</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <GovCard className="p-5 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><User className="w-4 h-4" /> Farmer Details</h3>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Name:</span> {claim.farmerName}</p>
            <p><span className="text-gray-500">UDLRM:</span> {claim.udlrm}</p>
            <p><span className="text-gray-500">State:</span> {claim.state}</p>
            <p><span className="text-gray-500">District:</span> {claim.district}</p>
            <p><span className="text-gray-500">Crop:</span> {claim.cropType}</p>
          </div>
        </GovCard>

        <GovCard className="p-5 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Claim Details</h3>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Season:</span> {claim.season}</p>
            <p><span className="text-gray-500">Cause:</span> {claim.causeOfLoss}</p>
            <p><span className="text-gray-500">Date of Loss:</span> {claim.dateOfLoss}</p>
            <p><span className="text-gray-500">Declared Loss:</span> {claim.declaredLoss}%</p>
            <p><span className="text-gray-500">Claim Amount:</span> ₹{claim.claimAmount?.toLocaleString()}</p>
          </div>
        </GovCard>
      </div>

      <GovCard className="p-5 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Fraud Assessment</h3>
        <div className="flex items-center gap-4">
          <div className={`text-3xl font-bold ${claim.fraudScore > 60 ? 'text-red-600' : claim.fraudScore > 30 ? 'text-yellow-600' : 'text-green-600'}`}>{claim.fraudScore}/100</div>
          <StatusBadge status={claim.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {claim.fraudFlags?.map((f: string) => (
            <span key={f} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">{f}</span>
          )) || <span className="text-sm text-gray-500">No flags triggered</span>}
        </div>
      </GovCard>

      <GovCard className="p-5 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4" /> Satellite Snapshot</h3>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-gray-500">NDVI at Claim</p>
            <p className="text-lg font-bold">{claim.ndviAtClaim ?? '—'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-gray-500">NDVI at Sowing</p>
            <p className="text-lg font-bold">{claim.ndviAtSowing ?? '—'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-gray-500">Soil Moisture</p>
            <p className="text-lg font-bold">{claim.soilMoistureAtClaim ?? '—'}%</p>
          </div>
        </div>
      </GovCard>

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
    </div>
  );
}
