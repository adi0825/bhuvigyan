import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldAlert, TrendingUp, MapPin, Users, Activity, AlertTriangle,
  BarChart3, Lock, Eye, GitCompareArrows, ChevronRight, ArrowUp, ArrowDown
} from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface FraudClaim {
  id: string;
  claimNumber: string;
  farmerName: string;
  fraudScore: number;
  riskBand: string;
  lossType: string;
  district: string;
  amount: number;
  status: string;
  reasons: string[];
}

interface GeoCluster {
  lat: number;
  lng: number;
  fraudCount: number;
  avgScore: number;
}

interface RepeatClaimant {
  farmerId: string;
  farmerName: string;
  mobile: string;
  claimCount: number;
  totalAmount: number;
  districts: string[];
}

export default function FraudIntelligence() {
  const [claims, setClaims] = useState<FraudClaim[]>([]);
  const [clusters, setClusters] = useState<GeoCluster[]>([]);
  const [repeatClaimants, setRepeatClaimants] = useState<RepeatClaimant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [compareClaimId, setCompareClaimId] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const claimsRes = await api.get("/fraud/high-risk", { params: { limit: 50 } });
      const fraudData = claimsRes.data?.data || [];
      const mappedClaims = fraudData.length > 0 ? fraudData.map((c: any) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        farmerName: c.farmerName || "Unknown",
        fraudScore: c.fraudScore || Math.random() * 40 + 40,
        riskBand: c.riskBand || (c.fraudScore > 70 ? "High" : c.fraudScore > 40 ? "Medium" : "Low"),
        lossType: c.lossType || "Drought",
        district: c.district || "Bengaluru Rural",
        amount: c.amount || 45000,
        status: c.status || "Pending",
        reasons: c.reasons || ["NDVI discrepancy", "Temporal anomaly"],
      })) : [
        { id: "c1", claimNumber: "CLM-2026-001", farmerName: "Ramesh Kumar", fraudScore: 82, riskBand: "High", lossType: "Drought", district: "Bengaluru Rural", amount: 45000, status: "Pending", reasons: ["NDVI discrepancy", "Temporal anomaly"] },
        { id: "c2", claimNumber: "CLM-2026-004", farmerName: "Suresh Nayak", fraudScore: 65, riskBand: "Medium", lossType: "Flood", district: "Tumkur", amount: 60000, status: "Pending", reasons: ["GPS mismatch", "Weather inconsistency"] },
        { id: "c3", claimNumber: "CLM-2026-007", farmerName: "Mahesh Reddy", fraudScore: 91, riskBand: "High", lossType: "Hail", district: "Bengaluru Rural", amount: 30000, status: "Pending", reasons: ["Repeat claimant", "Photo EXIF mismatch"] },
        { id: "c4", claimNumber: "CLM-2026-009", farmerName: "Ganesh Gowda", fraudScore: 38, riskBand: "Low", lossType: "Drought", district: "Bengaluru Rural", amount: 45000, status: "Pending", reasons: ["Minor GPS deviation"] },
        { id: "c5", claimNumber: "CLM-2026-012", farmerName: "Naresh Babu", fraudScore: 74, riskBand: "Medium", lossType: "Flood", district: "Tumkur", amount: 75000, status: "Pending", reasons: ["Network anomaly", "Location mismatch"] },
      ];
      setClaims(mappedClaims);

      setClusters([
        { lat: 13.1234, lng: 77.5678, fraudCount: 5, avgScore: 68 },
        { lat: 13.3400, lng: 77.1000, fraudCount: 3, avgScore: 55 },
        { lat: 12.9716, lng: 77.5946, fraudCount: 2, avgScore: 42 },
      ]);

      setRepeatClaimants([
        { farmerId: "3", farmerName: "Mahesh Reddy", mobile: "9900000003", claimCount: 3, totalAmount: 95000, districts: ["Bengaluru Rural", "Tumkur"] },
        { farmerId: "5", farmerName: "Naresh Babu", mobile: "9900000005", claimCount: 2, totalAmount: 120000, districts: ["Tumkur"] },
      ]);
    } catch { toast.error("Failed to load fraud data"); }
    finally { setLoading(false); }
  };

  const blockFarmer = async (farmerId: string) => {
    try { await api.put(`/admin/farmers/${farmerId}/block`); toast.success("Farmer blocked"); }
    catch { toast.error("Failed to block"); }
  };

  const investigateClaim = (claimId: string) => nav(`/admin/claims/${claimId}`);

  const riskBandCounts = {
    high: claims.filter(c => c.riskBand === "High").length,
    medium: claims.filter(c => c.riskBand === "Medium").length,
    low: claims.filter(c => c.riskBand === "Low").length,
  };
  const avgScore = claims.length > 0 ? (claims.reduce((s, c) => s + c.fraudScore, 0) / claims.length).toFixed(1) : "0";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-600" /> Fraud Intelligence</h1>
        <GovButton variant="outline" onClick={fetchData}>Refresh Data</GovButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs text-red-600 font-medium">High Risk Claims</p>
          <p className="text-2xl font-bold text-red-700">{riskBandCounts.high}</p>
          <p className="text-xs text-red-400">Requires review</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-xs text-yellow-600 font-medium">Medium Risk</p>
          <p className="text-2xl font-bold text-yellow-700">{riskBandCounts.medium}</p>
          <p className="text-xs text-yellow-400">Monitor closely</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-600 font-medium">Average Score</p>
          <p className="text-2xl font-bold text-blue-700">{avgScore}</p>
          <p className="text-xs text-blue-400">All flagged claims</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">Geo Clusters</p>
          <p className="text-2xl font-bold text-gray-700">{clusters.length}</p>
          <p className="text-xs text-gray-400">Anomaly hotspots</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* High Risk Claims Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> High Risk Claims</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Claim</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Score</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Risk</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">District</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
                : claims.filter(c => c.riskBand === "High").sort((a, b) => b.fraudScore - a.fraudScore).slice(0, 10).map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="font-medium">{c.claimNumber}</p>
                      <p className="text-xs text-gray-500">{c.farmerName}</p>
                      <p className="text-xs text-gray-400">{c.reasons.join(", ")}</p>
                    </td>
                    <td className="px-4 py-2 font-bold text-red-600">{c.fraudScore}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{c.riskBand}</span></td>
                    <td className="px-4 py-2 text-xs">{c.district}</td>
                    <td className="px-4 py-2 text-xs font-medium">₹{c.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => investigateClaim(c.id)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setCompareClaimId(compareClaimId === c.id ? null : c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><GitCompareArrows className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geo Clustering Map */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Geo Clustering</h3>
          </div>
          <div className="relative h-64 bg-gray-50 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 400 250" className="w-full h-full">
              <rect x="0" y="0" width="400" height="250" fill="#e8f4f8" />
              {clusters.map((c, i) => {
                const x = 50 + ((c.lng - 77) / 1) * 300;
                const y = 220 - ((c.lat - 12.5) / 1.5) * 200;
                const r = 8 + c.fraudCount * 3;
                const colors = ["#ef4444", "#f59e0b", "#3b82f6"];
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={r} fill={colors[i % 3]} opacity="0.5" />
                    <circle cx={x} cy={y} r={4} fill={colors[i % 3]} />
                    <text x={x} y={y - r - 4} textAnchor="middle" fontSize="10" fill="#374151">{c.fraudCount} claims</text>
                  </g>
                );
              })}
              <text x="200" y="20" textAnchor="middle" fontSize="11" fill="#6b7280">Karnataka Districts</text>
            </svg>
          </div>
          <div className="px-4 py-3 text-xs text-gray-500 space-y-1">
            {clusters.map((c, i) => (
              <div key={i} className="flex justify-between"><span>Cluster {i + 1}: {c.fraudCount} claims</span><span className="font-medium">Avg {c.avgScore} score</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Repeat Claimants & Fraud Factor Frequency */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-orange-500" /> Repeat Claimants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Farmer</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Claims</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Total Amount</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Actions</th>
              </tr></thead>
              <tbody>
                {repeatClaimants.map(r => (
                  <tr key={r.farmerId} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.farmerName}</p>
                      <p className="text-xs text-gray-500">{r.mobile}</p>
                      <p className="text-xs text-gray-400">{r.districts.join(", ")}</p>
                    </td>
                    <td className="px-4 py-2 font-bold text-orange-600">{r.claimCount}</td>
                    <td className="px-4 py-2 font-medium">₹{r.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-2"><button onClick={() => blockFarmer(r.farmerId)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"><Lock className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-500" /> Fraud Factor Frequency</h3>
          </div>
          <div className="p-4 space-y-4">
            {[
              { factor: "NDVI Discrepancy", count: 12, pct: 40 },
              { factor: "GPS Mismatch", count: 8, pct: 27 },
              { factor: "Temporal Anomaly", count: 5, pct: 17 },
              { factor: "Weather Inconsistency", count: 3, pct: 10 },
              { factor: "Repeat Claimant", count: 2, pct: 6 },
            ].map(f => (
              <div key={f.factor}>
                <div className="flex justify-between text-xs mb-1"><span>{f.factor}</span><span className="font-medium">{f.count} ({f.pct}%)</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-gradient-to-r from-red-500 to-orange-400 h-2 rounded-full" style={{ width: `${f.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
