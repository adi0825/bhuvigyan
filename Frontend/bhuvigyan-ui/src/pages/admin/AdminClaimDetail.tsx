import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft, MapPin, Calendar, IndianRupee, FileText, Image as ImageIcon,
  Video, AlertTriangle, CheckCircle, XCircle, ShieldAlert, Eye,
  Activity, User, BarChart3
} from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface ClaimDetailData {
  id: string;
  claimNumber: string;
  farmerId: string;
  farmerName: string;
  status: string;
  lossType: string;
  lossDate: string;
  affectedArea: number;
  claimAmount: number;
  approvedAmount?: number;
  description: string;
  gps: { lat: number; lng: number };
  filedAt: string;
  decidedAt?: string;
  fraudScore: number;
  riskLevel: string;
  timeline: Array<{ status: string; at: string; note: string; by?: string }>;
  documents: Array<{ type: string; url: string; status: string }>;
  satellite: { ndvi: number; weather: string; anomaly: boolean };
}

export default function AdminClaimDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [claim, setClaim] = useState<ClaimDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionNote, setDecisionNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");

  useEffect(() => { fetchClaim(); }, [id]);

  const fetchClaim = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/claims/${id}/dossier`);
      const data = res.data?.data;
      if (data) {
        setClaim(data);
      } else {
        setClaim({
          id: id || "c1", claimNumber: "CLM-2026-001", farmerId: "1", farmerName: "Ramesh Kumar",
          status: "SUBMITTED", lossType: "Drought", lossDate: "2026-05-10",
          affectedArea: 2.5, claimAmount: 45000, description: "Severe drought across entire plot.",
          gps: { lat: 13.1234, lng: 77.5678 }, filedAt: "2026-05-11T10:00:00Z",
          fraudScore: 45, riskLevel: "Medium",
          timeline: [
            { status: "DRAFT", at: "2026-05-11T09:00:00Z", note: "Claim drafted by farmer" },
            { status: "SUBMITTED", at: "2026-05-11T10:00:00Z", note: "Submitted for review" },
          ],
          documents: [
            { type: "FIR Copy", url: "#", status: "verified" },
            { type: "Crop Cutting Photo", url: "#", status: "verified" },
            { type: "Bank Passbook", url: "#", status: "pending" },
          ],
          satellite: { ndvi: 0.28, weather: "Deficient", anomaly: true },
        });
      }
    } catch { toast.error("Failed to load claim"); }
    finally { setLoading(false); }
  };

  const decideClaim = async (status: string) => {
    try {
      await api.put(`/state/claims/${id}/decision`, {
        status, approvedAmount: status === "APPROVED" ? parseFloat(approvedAmount || "0") : undefined,
        note: decisionNote,
      });
      toast.success(`Claim ${status.toLowerCase()}`);
      fetchClaim();
    } catch { toast.error("Decision failed"); }
  };

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800", SUBMITTED: "bg-blue-100 text-blue-800",
    OFFICER_REVIEW: "bg-yellow-100 text-yellow-800", CCE_VISIT: "bg-orange-100 text-orange-800",
    AUTO_APPROVED: "bg-green-100 text-green-800", APPROVED: "bg-green-100 text-green-800",
    AUTO_REJECTED: "bg-red-100 text-red-800", REJECTED: "bg-red-100 text-red-800",
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!claim) return <div className="p-8 text-center text-gray-500">Claim not found</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => nav("/admin/claims")} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Claim {claim.claimNumber}</h1>
          <p className="text-sm text-gray-500">Filed by <span className="font-medium text-gray-700">{claim.farmerName}</span> on {new Date(claim.filedAt).toLocaleDateString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[claim.status] || "bg-gray-100"}`}>{claim.status}</span>
      </div>

      {/* Fraud Score Card */}
      <div className={`rounded-xl p-4 border ${claim.fraudScore > 70 ? "bg-red-50 border-red-200" : claim.fraudScore > 40 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className={`w-6 h-6 ${claim.fraudScore > 70 ? "text-red-600" : claim.fraudScore > 40 ? "text-yellow-600" : "text-green-600"}`} />
            <div>
              <p className="font-bold text-sm">Fraud Score: {claim.fraudScore}/100</p>
              <p className="text-xs">Risk Level: <span className="font-medium">{claim.riskLevel}</span></p>
            </div>
          </div>
          <GovButton variant="outline" size="sm" onClick={() => nav(`/admin/fraud?claim=${claim.id}`)}>View Fraud Analysis</GovButton>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Claim Info */}
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Claim Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs">Loss Type</p><p className="font-medium">{claim.lossType}</p></div>
            <div><p className="text-gray-500 text-xs">Loss Date</p><p className="font-medium">{claim.lossDate}</p></div>
            <div><p className="text-gray-500 text-xs">Affected Area</p><p className="font-medium">{claim.affectedArea} Ha</p></div>
            <div><p className="text-gray-500 text-xs">Claim Amount</p><p className="font-medium">₹{(claim.claimAmount ?? 0).toLocaleString()}</p></div>
            <div className="col-span-2"><p className="text-gray-500 text-xs">Description</p><p className="font-medium">{claim.description}</p></div>
            <div className="col-span-2 flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" /> {claim.gps?.lat?.toFixed(4) ?? '—'}, {claim.gps?.lng?.toFixed(4) ?? '—'}</div>
          </div>
        </div>

        {/* Satellite Evidence */}
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-green-500" /> Satellite Evidence</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">NDVI Value</span><span className={`font-medium ${(claim.satellite?.ndvi ?? 0) < 0.3 ? "text-red-600" : "text-green-600"}`}>{claim.satellite?.ndvi ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Weather</span><span className="font-medium">{claim.satellite?.weather ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Anomaly Detected</span><span className={`font-medium ${claim.satellite?.anomaly ? "text-red-600" : "text-green-600"}`}>{claim.satellite?.anomaly ? "Yes" : "No"}</span></div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-500" /> Documents & Evidence</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {claim.documents.map((d, i) => (
            <div key={i} className="border rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><FileText className="w-5 h-5 text-gray-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.type}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${d.status === "verified" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{d.status}</span>
              </div>
              <Eye className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-sm mb-4">Status Timeline</h3>
        <div className="space-y-4">
          {claim.timeline.map((t, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${i === claim.timeline.length - 1 ? "bg-blue-500" : "bg-gray-300"}`} />
                {i < claim.timeline.length - 1 && <div className="w-0.5 h-full bg-gray-200" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium">{t.status}</p>
                <p className="text-xs text-gray-500">{new Date(t.at).toLocaleString()}{t.by ? ` · by ${t.by}` : ""}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Panel */}
      {claim.status === "SUBMITTED" || claim.status === "OFFICER_REVIEW" ? (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Review Decision</h3>
          <div className="space-y-3">
            <textarea placeholder="Decision note / remarks..." value={decisionNote} onChange={e => setDecisionNote(e.target.value)} className="w-full border rounded-lg p-3 text-sm min-h-[80px]" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Approved Amount (₹)</label>
                <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} placeholder={String(claim.claimAmount)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <GovButton variant="primary" onClick={() => decideClaim("APPROVED")}><CheckCircle className="w-4 h-4 mr-1" /> Approve</GovButton>
              <GovButton variant="outline" onClick={() => decideClaim("REJECTED")}><XCircle className="w-4 h-4 mr-1" /> Reject</GovButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
