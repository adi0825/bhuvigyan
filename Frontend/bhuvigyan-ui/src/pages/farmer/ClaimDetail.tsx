import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface ClaimData {
  id: string;
  claimNumber: string;
  status: string;
  declaredCrop: string;
  damageType: string;
  damagePercent: number | null;
  claimedAreaHa: number;
  fraudScore: number | null;
  filedAt: string;
  approvedAmount: number | null;
}

export default function ClaimDetail() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (claimId) fetchClaim();
  }, [claimId]);

  const fetchClaim = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/claims/${claimId}`);
      setClaim((res.data as any)?.data || null);
    } catch {
      toast.error('Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };

  const c = claim;

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    OFFICER_REVIEW: "bg-yellow-100 text-yellow-800",
    CCE_VISIT: "bg-orange-100 text-orange-800",
    AUTO_APPROVED: "bg-green-100 text-green-800",
    APPROVED: "bg-green-100 text-green-800",
    AUTO_REJECTED: "bg-red-100 text-red-800",
    REJECTED: "bg-red-100 text-red-800",
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6 text-center text-gray-500">Loading claim details...</div>;
  }
  if (!c) {
    return <div className="max-w-3xl mx-auto p-6 text-center text-gray-500">Claim not found</div>;
  }

  const score = c.fraudScore ?? 0;
  const riskLevel = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : score <= 80 ? "HIGH" : "CRITICAL";

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Claim {c.claimNumber}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[c.status] || "bg-gray-100"}`}>{c.status}</span>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold border-b pb-2">Claim Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-600">Crop:</span> {c.declaredCrop}</div>
          <div><span className="font-medium text-gray-600">Damage Type:</span> {c.damageType}</div>
          <div><span className="font-medium text-gray-600">Area:</span> {c.claimedAreaHa} ha</div>
          <div><span className="font-medium text-gray-600">Damage %:</span> {c.damagePercent ?? '—'}%</div>
          <div><span className="font-medium text-gray-600">Filed At:</span> {c.filedAt ? new Date(c.filedAt).toLocaleString() : '—'}</div>
          {c.approvedAmount !== null && (
            <div><span className="font-medium text-gray-600">Approved:</span> ₹{c.approvedAmount.toLocaleString("en-IN")}</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold border-b pb-2">Fraud Score</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={score <= 30 ? "#22c55e" : score <= 60 ? "#f59e0b" : score <= 80 ? "#f97316" : "#ef4444"} strokeWidth="3" strokeDasharray={`${score}, 100`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">{score}</div>
          </div>
          <div>
            <p className="text-lg font-semibold">{riskLevel} Risk</p>
            <p className="text-sm text-gray-500">Score determined by AI scoring pipeline</p>
          </div>
        </div>
      </div>
    </div>
  );
}
