import { useState } from "react";
import { TrendingUp, AlertTriangle, Shield, BarChart3 } from "lucide-react";

const mockData = {
  summary: { totalClaims: 1247, flaggedClaims: 89, fraudRate: 7.1, avgScore: 42.3, modelVersion: "v6.0-ensemble" },
  riskDistribution: [
    { range: "0-30", label: "Low", count: 520, color: "#22c55e" },
    { range: "31-60", label: "Medium", count: 380, color: "#f59e0b" },
    { range: "61-80", label: "High", count: 210, color: "#f97316" },
    { range: "81-100", label: "Critical", count: 137, color: "#ef4444" },
  ],
  topFactors: [
    { name: "claim_amount_ratio", occurrences: 342, avgWeight: 12.5 },
    { name: "geo_cluster_different_farmers", occurrences: 289, avgWeight: 8.0 },
    { name: "officer_loss_pct_diff", occurrences: 245, avgWeight: 7.5 },
    { name: "ndvi_mismatch", occurrences: 198, avgWeight: 10.0 },
    { name: "weather_mismatch", occurrences: 156, avgWeight: 12.0 },
  ],
  districtStats: [
    { district: "MH District 1", claims: 180, avgScore: 48.2, flagged: 18 },
    { district: "KA District 1", claims: 210, avgScore: 38.5, flagged: 12 },
    { district: "TG District 1", claims: 150, avgScore: 55.1, flagged: 22 },
    { district: "PB District 1", claims: 120, avgScore: 35.2, flagged: 8 },
    { district: "UP District 1", claims: 200, avgScore: 42.0, flagged: 15 },
    { district: "RJ District 1", claims: 170, avgScore: 40.1, flagged: 10 },
  ],
};

export default function FraudAnalytics() {
  const [period, setPeriod] = useState("30d");
  const { summary, riskDistribution, topFactors, districtStats } = mockData;

  const total = riskDistribution.reduce((s, r) => s + r.count, 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fraud Analytics</h1>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded-md px-3 py-1 text-sm">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-500">Total Claims</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalClaims.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-500">Flagged</span>
          </div>
          <p className="text-2xl font-bold">{summary.flaggedClaims}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-500">Fraud Rate</span>
          </div>
          <p className="text-2xl font-bold">{summary.fraudRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-500">Model</span>
          </div>
          <p className="text-lg font-bold">{summary.modelVersion}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Risk Distribution</h2>
          <div className="space-y-3">
            {riskDistribution.map((r) => (
              <div key={r.range}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{r.label} ({r.range})</span>
                  <span>{r.count} ({((r.count / total) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(r.count / total) * 100}%`, backgroundColor: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Fraud Factors</h2>
          <div className="space-y-3">
            {topFactors.map((f, i) => (
              <div key={f.name} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-gray-400">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.name.replace(/_/g, " ")}</span>
                    <span className="text-gray-500">{f.occurrences} times</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (f.occurrences / 400) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">District-level Fraud Heatmap</h2>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">District</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Claims</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Avg Score</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Flagged</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Flag Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {districtStats.map((d) => (
              <tr key={d.district} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.district}</td>
                <td className="px-4 py-3">{d.claims}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${d.avgScore <= 30 ? "text-green-600" : d.avgScore <= 60 ? "text-yellow-600" : d.avgScore <= 80 ? "text-orange-600" : "text-red-600"}`}>{d.avgScore.toFixed(1)}</span>
                </td>
                <td className="px-4 py-3">{d.flagged}</td>
                <td className="px-4 py-3">{((d.flagged / d.claims) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
