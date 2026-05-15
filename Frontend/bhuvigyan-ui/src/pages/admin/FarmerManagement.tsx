import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, CheckCircle, XCircle, Eye, Download, Lock,
  ChevronDown, ChevronUp, MapPin, Phone, FileText, Shield
} from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface FarmerRecord {
  id: string;
  fullName: string;
  mobile: string;
  village: string;
  district: string;
  state: string;
  registeredAt: string;
  verificationStatus: string;
  landAreaHa: number;
  claimsCount: number;
}

const statusColors: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-700",
};

export default function FarmerManagement() {
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => { fetchFarmers(); }, []);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/farmers", { params: { page: 1, limit: 100 } });
      const data = res.data?.data?.farmers || [];
      const augmented: FarmerRecord[] = data.map((f: any) => ({
        id: f.id, fullName: f.fullName, mobile: f.mobile,
        village: f.village || "—", district: f.district || "—",
        state: f.state || "—", registeredAt: f.registeredAt || "—",
        verificationStatus: f.isVerified ? "verified" : (f.verificationStatus || "pending"),
        landAreaHa: f.landAreaHa ?? 0, claimsCount: f.claimsCount ?? 0,
      }));
      setFarmers(augmented);
    } catch { toast.error("Failed to load farmers"); }
    finally { setLoading(false); }
  };

  const verifyFarmer = async (id: string, status: string) => {
    try {
      await api.put(`/admin/farmers/${id}/verify`, { status });
      setFarmers(prev => prev.map(f => f.id === id ? { ...f, verificationStatus: status } : f));
      toast.success(`Farmer ${status}`);
    } catch { toast.error("Failed to update"); }
  };

  const suspendFarmer = async (id: string) => {
    try {
      await api.put(`/admin/farmers/${id}/suspend`);
      setFarmers(prev => prev.map(f => f.id === id ? { ...f, verificationStatus: "suspended" } : f));
      toast.success("Farmer suspended");
    } catch { toast.error("Failed to suspend"); }
  };

  const filtered = farmers.filter(f => {
    const matchesSearch = !search || f.fullName.toLowerCase().includes(search.toLowerCase()) || f.mobile.includes(search);
    const matchesStatus = !statusFilter || f.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" /> Farmer Management</h1>
        <GovButton variant="outline"><Download className="w-4 h-4 mr-1" /> Export CSV</GovButton>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or mobile..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Farmer</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Land</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Claims</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No farmers found</td></tr>
            : filtered.map(f => (
              <Fragment key={f.id}>
                <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>
                  <td className="px-4 py-3"><p className="font-medium">{f.fullName}</p><p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {f.mobile}</p></td>
                  <td className="px-4 py-3"><p className="text-xs text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.village}, {f.district}</p><p className="text-xs text-gray-400">{f.state}</p></td>
                  <td className="px-4 py-3 font-medium">{f.landAreaHa} Ha</td>
                  <td className="px-4 py-3">{f.claimsCount}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[f.verificationStatus] || "bg-gray-100"}`}>{f.verificationStatus}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); nav(`/admin/farmers/${f.id}`); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
                      {f.verificationStatus === "pending" && (<><button onClick={(e) => { e.stopPropagation(); verifyFarmer(f.id, "verified"); }} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"><CheckCircle className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); verifyFarmer(f.id, "rejected"); }} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"><XCircle className="w-4 h-4" /></button></>)}
                      {f.verificationStatus !== "suspended" && <button onClick={(e) => { e.stopPropagation(); suspendFarmer(f.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Lock className="w-4 h-4" /></button>}
                      {expandedId === f.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </td>
                </tr>
                <AnimatePresence>
                  {expandedId === f.id && (
                    <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Documents</h4>
                            <p className="text-xs text-gray-500">No documents available</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Verification</h4>
                            <p className="text-xs text-gray-500">Status: {f.verificationStatus}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <h4 className="font-bold text-sm mb-3">Actions</h4>
                            <div className="space-y-2">
                              <GovButton variant="outline" size="sm" fullWidth onClick={() => nav(`/admin/farmers/${f.id}`)}>View Full Profile</GovButton>
                              <GovButton variant="outline" size="sm" fullWidth>Download Documents ZIP</GovButton>
                            </div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
