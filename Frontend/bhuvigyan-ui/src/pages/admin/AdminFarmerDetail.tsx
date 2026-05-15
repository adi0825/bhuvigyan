import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft, MapPin, Phone, User, Calendar, CheckCircle, XCircle,
  FileText, Leaf, AlertTriangle, TrendingUp, IndianRupee
} from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface FarmerDetail {
  id: string;
  fullName: string;
  mobile: string;
  village: string;
  district: string;
  state: string;
  registeredAt: string;
  verificationStatus: string;
  landAreaHa: number;
  carbonEligible: boolean;
  carbonEnrolled: boolean;
  latitude?: number;
  longitude?: number;
  claims: Array<{ id: string; claimNumber: string; status: string; amount: number; lossType: string; date: string }>;
  documents: Array<{ type: string; status: string; uploadedAt: string }>;
  ndviHistory: Array<{ month: string; value: number }>;
}

export default function AdminFarmerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFarmer(); }, [id]);

  const fetchFarmer = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/farmers/${id}`);
      const data = res.data?.data;
      if (data) {
        // Normalize backend data to match frontend interface
        const normalized: FarmerDetail = {
          id: data.id || id || "1",
          fullName: data.fullName || data.full_name || "Unknown",
          mobile: data.mobile || "—",
          village: data.village || "—",
          district: data.district || "—",
          state: data.state || data.state_code || "—",
          registeredAt: data.registeredAt || data.created_at || new Date().toISOString(),
          verificationStatus: data.verificationStatus || (data.isVerified ? "verified" : "pending"),
          landAreaHa: data.landAreaHa ?? data.land_area_ha ?? 0,
          carbonEligible: data.carbonEligible ?? data.carbon_eligible ?? false,
          carbonEnrolled: data.carbonEnrolled ?? data.carbon_enrolled ?? false,
          latitude: data.latitude ?? data.lat ?? undefined,
          longitude: data.longitude ?? data.lng ?? undefined,
          claims: data.claims || [],
          documents: data.documents || [],
          ndviHistory: data.ndviHistory || data.ndvi_history || [],
        };
        setFarmer(normalized);
      } else {
        setFarmer(null);
      }
    } catch {
      toast.error("Failed to load farmer details");
    } finally { setLoading(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!farmer) return <div className="p-8 text-center text-gray-500">Farmer not found</div>;

  const statusColors: Record<string, string> = {
    verified: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700", suspended: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => nav("/admin/farmers")} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold">Farmer Profile</h1>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">{farmer.fullName.charAt(0)}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold">{farmer.fullName}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[farmer.verificationStatus] || ""}`}>{farmer.verificationStatus}</span>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4" /> {farmer.mobile}</p>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" /> {farmer.village}, {farmer.district}, {farmer.state}</p>
          {farmer.latitude && farmer.longitude && (
            <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">GPS: {farmer.latitude.toFixed(4)}, {farmer.longitude.toFixed(4)}</p>
          )}
        </div>
        <div className="flex gap-2">
          {farmer.verificationStatus === "pending" && (
            <>
              <GovButton variant="primary" onClick={async () => { await api.put(`/admin/farmers/${id}/verify`, { status: "verified" }); toast.success("Verified"); fetchFarmer(); }}><CheckCircle className="w-4 h-4 mr-1" /> Verify</GovButton>
              <GovButton variant="outline" onClick={async () => { await api.put(`/admin/farmers/${id}/verify`, { status: "rejected" }); toast.success("Rejected"); fetchFarmer(); }}><XCircle className="w-4 h-4 mr-1" /> Reject</GovButton>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs text-gray-500">Total Land</p><p className="text-2xl font-bold text-blue-600">{farmer.landAreaHa} Ha</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs text-gray-500">Claims Filed</p><p className="text-2xl font-bold text-orange-600">{farmer.claims.length}</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs text-gray-500">Carbon Eligible</p><p className="text-2xl font-bold text-green-600">{farmer.carbonEligible ? (farmer.carbonEnrolled ? "Enrolled" : "Eligible") : "No"}</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Claims History */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Claims History</div>
          {farmer.claims.length === 0 ? <p className="p-4 text-sm text-gray-500">No claims filed</p>
          : <table className="w-full text-sm"><tbody>{farmer.claims.map(c => (
            <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => nav(`/admin/claims/${c.id}`)}>
              <td className="px-4 py-2"><p className="font-medium">{c.claimNumber}</p><p className="text-xs text-gray-500">{c.lossType} | {c.date}</p></td>
              <td className="px-4 py-2 text-right font-medium">₹{(c.amount ?? 0).toLocaleString()}</td>
            </tr>
          ))}</tbody></table>}
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-bold text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Documents</div>
          {farmer.documents.length === 0 ? <p className="p-4 text-sm text-gray-500">No documents uploaded</p>
          : <div className="p-4 space-y-3">
            {farmer.documents.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><span className="text-sm">{d.type}</span></div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.status === "verified" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{d.status}</span>
              </div>
            ))}
          </div>}
        </div>
      </div>

      {/* NDVI Chart */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> NDVI History (6 months)</h3>
        {farmer.ndviHistory.length === 0 ? <p className="text-sm text-gray-500">No NDVI data available. Satellite data requires GPS coordinates.</p>
        : <div className="h-40 flex items-end gap-4">
          {farmer.ndviHistory.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-green-100 rounded-t" style={{ height: `${n.value * 200}px` }} />
              <span className="text-xs text-gray-500">{n.month}</span>
              <span className="text-xs font-medium">{n.value}</span>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
