import { useState, useEffect } from "react";
import { BarChart3, Download, Filter, Calendar, FileText, Users, IndianRupee, AlertTriangle, Satellite, Leaf } from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import GovCard from "../../components/ui/GovCard";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function Reports() {
  const [reportType, setReportType] = useState("claims");
  const [dateRange, setDateRange] = useState("last-30-days");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSummary(); }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setSummary(res.data?.data || {});
    } catch { toast.error("Failed to load report data"); }
    finally { setLoading(false); }
  };

  const reportTypes = [
    { id: "claims", label: "Claims Summary", icon: FileText },
    { id: "farmers", label: "Farmer Registry", icon: Users },
    { id: "payments", label: "Payments", icon: IndianRupee },
    { id: "fraud", label: "Fraud Analysis", icon: AlertTriangle },
    { id: "satellite", label: "Satellite", icon: Satellite },
    { id: "carbon", label: "Carbon Credits", icon: Leaf },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" /> Reports</h1>
        <GovButton variant="outline" onClick={fetchSummary}><Download className="w-4 h-4 mr-1" /> Export</GovButton>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {reportTypes.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setReportType(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${reportType === t.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="last-7-days">Last 7 Days</option>
          <option value="last-30-days">Last 30 Days</option>
          <option value="last-90-days">Last 90 Days</option>
          <option value="this-year">This Year</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading report data...</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Farmers", value: summary?.totalFarmers ?? 0, color: "text-blue-600" },
            { label: "Active Claims", value: summary?.activeClaims ?? 0, color: "text-amber-600" },
            { label: "Fraud Alerts", value: summary?.fraudAlerts ?? 0, color: "text-red-600" },
            { label: "Pending Visits", value: summary?.pendingVisits ?? 0, color: "text-purple-600" },
            { label: "Auto Approved", value: summary?.autoApproved ?? 0, color: "text-green-600" },
            { label: "Auto Rejected", value: summary?.autoRejected ?? 0, color: "text-gray-600" },
            { label: "Carbon Enrolled", value: summary?.carbonEnrolled ?? 0, color: "text-teal-600" },
            { label: "Review Needed", value: summary?.reviewNeeded ?? 0, color: "text-orange-600" },
          ].map(s => (
            <GovCard key={s.label} className="p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </GovCard>
          ))}
        </div>
      )}

      <GovCard className="p-6">
        <h3 className="font-bold text-gray-900 mb-2">Report Preview</h3>
        <p className="text-sm text-gray-500">
          {reportType === "claims" && "Summary of all claims filed, approved, rejected, and pending review for the selected period."}
          {reportType === "farmers" && "Farmer registration statistics, verification status, and district-wise breakdown."}
          {reportType === "payments" && "Payment disbursement status, pending settlements, and transaction summary."}
          {reportType === "fraud" && "Fraud score distribution, high-risk claims, and anomaly detection summary."}
          {reportType === "satellite" && "NDVI health trends, anomaly alerts, and satellite verification coverage."}
          {reportType === "carbon" && "Carbon credit enrolment, estimated credits, and practice adoption rates."}
        </p>
        <div className="mt-4 flex gap-2">
          <GovButton variant="primary" size="sm">Generate PDF</GovButton>
          <GovButton variant="outline" size="sm">Generate Excel</GovButton>
        </div>
      </GovCard>
    </div>
  );
}
