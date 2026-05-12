import { useState, useEffect } from "react";
import api from "../../api/axios";

interface QueueClaim {
  id: string;
  claimNumber: string;
  status: string;
  fraudScore: number;
  lossType: string;
  claimedAreaHa: number | null;
  claimAmount: number | null;
  filedAt: string;
}

export default function ClaimQueue() {
  const [claims, setClaims] = useState<QueueClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("SCORE_DESC");

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 100, offset: 0 };
      if (filter !== "ALL") params.status = filter;
      const res = await api.get("/state/claims", { params });
      setClaims(res.data.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = claims.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "SCORE_DESC") return (b.fraudScore || 0) - (a.fraudScore || 0);
    if (sortBy === "SCORE_ASC") return (a.fraudScore || 0) - (b.fraudScore || 0);
    if (sortBy === "DATE_DESC") return new Date(b.filedAt || 0).getTime() - new Date(a.filedAt || 0).getTime();
    return new Date(a.filedAt || 0).getTime() - new Date(b.filedAt || 0).getTime();
  });

  const riskLevel = (score: number) => {
    if (score <= 30) return "LOW";
    if (score <= 60) return "MEDIUM";
    if (score <= 80) return "HIGH";
    return "CRITICAL";
  };

  const riskColors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    CRITICAL: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Review Queue</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        {["ALL", "OFFICER_REVIEW", "CCE_VISIT"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="ml-auto border rounded-md px-3 py-1 text-sm">
          <option value="SCORE_DESC">Fraud Score (High → Low)</option>
          <option value="SCORE_ASC">Fraud Score (Low → High)</option>
          <option value="DATE_DESC">Filed (Newest)</option>
          <option value="DATE_ASC">Filed (Oldest)</option>
        </select>
      </div>

      {loading && <p className="text-gray-500 py-4">Loading claims...</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Claim #</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fraud Score</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Risk</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Loss Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Claim Amount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Filed</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.claimNumber}</td>
                <td className="px-4 py-3"><span className="text-xs font-medium">{c.status.replace("_", " ")}</span></td>
                <td className="px-4 py-3 font-bold">{c.fraudScore}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[riskLevel(c.fraudScore)]}`}>{riskLevel(c.fraudScore)}</span></td>
                <td className="px-4 py-3">{c.lossType || "—"}</td>
                <td className="px-4 py-3">{c.claimAmount ? `₹${c.claimAmount.toLocaleString("en-IN")}` : "—"}</td>
                <td className="px-4 py-3 text-gray-500">{c.filedAt ? new Date(c.filedAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  <a href={`/state/claims/${c.id}`} className="text-blue-600 hover:underline font-medium">Review</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sorted.length === 0 && <p className="text-center text-gray-500 py-8">No claims in queue</p>}
      </div>
    </div>
  );
}
