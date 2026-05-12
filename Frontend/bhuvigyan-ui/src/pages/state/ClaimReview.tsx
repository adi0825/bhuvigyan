import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useFraudScore } from "../../hooks/useFraudScore";

interface DossierData {
  claim: Record<string, any>;
  farmer: Record<string, any>;
  policy: Record<string, any>;
  inspection: Record<string, any>;
  fraud: Record<string, any>;
  evidence: Array<Record<string, any>>;
  generatedAt: string;
}

export default function ClaimReview() {
  const { claimId } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("summary");
  const [decision, setDecision] = useState<"" | "APPROVE" | "REJECT" | "FLAG">("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [reason, setReason] = useState("");
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { score: fraudScore, loading: scoreLoading } = useFraudScore(claimId);

  useEffect(() => {
    if (!claimId) return;
    fetchDossier();
  }, [claimId]);

  const fetchDossier = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/claims/${claimId}/dossier`);
      setDossier(res.data.data);
    } catch (err) {
      console.error("Failed to fetch dossier:", err);
    } finally {
      setLoading(false);
    }
  };

  const c = dossier?.claim;
  const f = dossier?.farmer;
  const p = dossier?.policy;
  const ins = dossier?.inspection;
  const ev = dossier?.evidence || [];

  const handleDecision = async () => {
    if (!decision || !claimId) return alert("Select a decision");
    if (decision === "APPROVE") {
      if (!approvedAmount || (c?.claimAmount && parseFloat(approvedAmount) > c.claimAmount)) return alert("Enter valid approved amount");
    }
    if ((decision === "REJECT" || decision === "FLAG") && reason.length < 20) return alert("Reason must be at least 20 characters");

    setSubmitting(true);
    try {
      const params = new URLSearchParams();
      params.append("decision", decision);
      if (decision === "APPROVE") params.append("approved_amount", approvedAmount);
      if (decision === "REJECT") params.append("rejection_reason", reason);
      if (decision === "FLAG") params.append("review_notes", reason);

      await api.post(`/state/claims/${claimId}/decision?${params.toString()}`);
      alert(`Claim ${c?.claimNumber || claimId} ${decision.toLowerCase()}d successfully`);
      nav("/state/claim-queue");
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading claim details...</div>;
  if (!dossier) return <div className="p-6 text-red-500">Failed to load claim details</div>;

  const riskLevel = (fraudScore?.riskLevel) || "MEDIUM";
  const fraudScoreValue = fraudScore?.score || 0;
  const topFactors = fraudScore?.explanation?.topFactors || [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Review Claim {c.claimNumber}</h1>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskLevel === "LOW" ? "bg-green-100 text-green-800" : riskLevel === "MEDIUM" ? "bg-yellow-100 text-yellow-800" : riskLevel === "HIGH" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}`}>{riskLevel}</span>
          <span className="text-lg font-bold">{fraudScoreValue}</span>
          {scoreLoading && <span className="text-xs text-gray-400">loading...</span>}
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b">
        {["summary", "evidence", "satellite", "fraud"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium text-gray-600">Farmer:</span> {f?.fullName || "—"} ({f?.mobile || "—"})</div>
            <div><span className="font-medium text-gray-600">Location:</span> {f?.village || "—"}, {f?.district || "—"}, {f?.state || "—"}</div>
            <div><span className="font-medium text-gray-600">Policy:</span> {p?.policyNumber || "—"} — {p?.crop || "—"} ({p?.insuredArea || "—"} ha)</div>
            <div><span className="font-medium text-gray-600">Sum Insured:</span> {p?.sumInsured ? `ₚ${p.sumInsured.toLocaleString("en-IN")}` : "—"}</div>
            <div><span className="font-medium text-gray-600">Loss Type:</span> {c?.lossType || "—"}</div>
            <div><span className="font-medium text-gray-600">Loss Date:</span> {c?.lossDate || "—"}</div>
            <div><span className="font-medium text-gray-600">Affected Area:</span> {c?.affectedArea || "—"} ha</div>
            <div><span className="font-medium text-gray-600">Claim Amount:</span> {c?.claimAmount ? `₹${c.claimAmount.toLocaleString("en-IN")}` : "—"}</div>
            <div className="sm:col-span-2"><span className="font-medium text-gray-600">Description:</span> {c?.description || "—"}</div>
          </div>
        </div>
      )}

      {tab === "evidence" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-3">Evidence Photos ({ev.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ev.map((e, i) => (
              <div key={i} className="border rounded-md overflow-hidden">
                <img src={e.url} alt="" className="w-full h-40 object-cover" />
                <div className="p-2 text-xs text-gray-500">
                  <p>GPS: {e.gps?.lat || "—"}, {e.gps?.lng || "—"}</p>
                  <p>{e.exifTimestamp ? new Date(e.exifTimestamp).toLocaleString() : "—"}</p>
                </div>
              </div>
            ))}
          </div>
          {ins && (
            <>
              <h3 className="font-semibold mt-6 mb-3">Inspection Report</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Actual Loss:</span> {ins.actualLossPct || "—"}%</p>
                <p><span className="font-medium">Crop Condition:</span> {ins.cropCondition || "—"}</p>
                <p><span className="font-medium">Weather Correlated:</span> {ins.weatherCorrelated ? "Yes" : "No"}</p>
                <p><span className="font-medium">Remarks:</span> {ins.remarks || "—"}</p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "satellite" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-3">Satellite Evidence</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border rounded-md p-4">
              <p className="text-sm text-gray-500">NDVI at Claim</p>
              <p className="text-2xl font-bold text-orange-500">{dossier?.fraud?.ndviValue || "—"}</p>
              <p className="text-sm font-medium">{dossier?.fraud?.ndviLabel || "—"}</p>
            </div>
            <div className="border rounded-md p-4">
              <p className="text-sm text-gray-500">Weather on Loss Date</p>
              <p className="text-lg font-medium">{dossier?.fraud?.rainfall || "—"}mm rainfall</p>
              <p className="text-sm">{dossier?.fraud?.temp || "—"}°C</p>
            </div>
          </div>
        </div>
      )}

      {tab === "fraud" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${fraudScoreValue}, 100`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold">{fraudScoreValue}</div>
            </div>
            <div>
              <p className="text-lg font-semibold">{riskLevel} Risk</p>
              <p className="text-sm text-gray-500">Confidence: {fraudScore?.confidence ? Math.round(fraudScore.confidence * 100) : 0}%</p>
            </div>
          </div>
          <h3 className="font-semibold mb-2">Top Contributing Factors</h3>
          <div className="space-y-2">
            {topFactors.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 text-xs font-bold text-right">{f.direction}{f.weight}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="bg-orange-400 h-full" style={{ width: `${Math.min(100, f.weight * 4)}%` }} />
                </div>
                <div className="flex-1 text-sm">{f.description}</div>
              </div>
            ))}
            {topFactors.length === 0 && <p className="text-gray-500 text-sm">No significant fraud indicators.</p>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Decision</h2>
        <div className="flex gap-3 mb-4">
          {["APPROVE", "REJECT", "FLAG"].map((d) => (
            <button key={d} onClick={() => setDecision(d as any)} className={`px-4 py-2 rounded-md font-medium ${decision === d ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {d}
            </button>
          ))}
        </div>
        {decision === "APPROVE" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Approved Amount (₹)</label>
            <input type="number" className="mt-1 w-full border rounded-md p-2" max={c?.claimAmount || 0} value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} placeholder={`Max ₹${c?.claimAmount || 0}`} />
          </div>
        )}
        {(decision === "REJECT" || decision === "FLAG") && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Reason (min 20 chars)</label>
            <textarea rows={3} className="mt-1 w-full border rounded-md p-2" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <button onClick={handleDecision} disabled={submitting} className={`px-6 py-2 rounded-md font-medium text-white ${decision === "APPROVE" ? "bg-green-600 hover:bg-green-700" : decision === "REJECT" ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"} disabled:opacity-50`}>
          {submitting ? "Submitting..." : `Confirm ${decision}`}
        </button>
      </div>
    </div>
  );
}
