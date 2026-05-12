import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IndianRupee, RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowRightLeft } from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface PaymentRecord {
  id: string;
  claimId: string;
  farmerName: string;
  amount: number;
  bankAccountMasked: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  processing: "bg-yellow-100 text-yellow-700",
  settled: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  reversed: "bg-orange-100 text-orange-700",
};

export default function Payments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, queued: 0, processing: 0, settled: 0, failed: 0, totalSettledInr: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => { fetchPayments(); fetchStats(); }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments", { params: { status: filter || undefined } });
      setPayments(res.data?.data || []);
    } catch { toast.error("Failed to load payments"); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try { const res = await api.get("/payments/stats"); setStats(res.data?.data || {}); }
    catch { /* ignore */ }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments & Disbursement</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: IndianRupee },
          { label: "Queued", value: stats.queued, icon: Clock },
          { label: "Settled", value: stats.settled, icon: CheckCircle },
          { label: "Total Paid (₹)", value: `₹${(stats.totalSettledInr || 0).toLocaleString()}`, icon: IndianRupee },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{k.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <select value={filter} onChange={e => { setFilter(e.target.value); fetchPayments(); }} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="settled">Settled</option>
          <option value="failed">Failed</option>
        </select>
        <GovButton variant="outline" onClick={fetchPayments}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</GovButton>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Payment ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Farmer</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Account</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">No payments found</td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{p.farmerName}</td>
                <td className="px-4 py-3 font-bold">₹{p.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.bankAccountMasked}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || "bg-gray-100"}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
