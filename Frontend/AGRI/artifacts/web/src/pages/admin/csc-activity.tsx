import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, Users, TrendingUp, ShieldAlert } from "lucide-react";

interface CscActivity {
  id: string;
  cscOperatorId: string | null;
  activityDate: string;
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  reviewCount: number;
  uniqueFarmers: number;
  uniqueUdlrns: number;
  uniqueDistricts: number;
  avgFraudScore: string | null;
  bulkPatternFlag: boolean;
  riskScore: string;
  riskTier: string;
  flaggedBySystem: boolean;
  flagReason: string | null;
}

function riskColor(tier: string) {
  if (tier === "HIGH") return "text-red-600 bg-red-50 border-red-200";
  if (tier === "MEDIUM") return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-green-700 bg-green-50 border-green-200";
}

export default function AdminCscActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-csc-activity"],
    queryFn: () => apiFetch<{ data: CscActivity[] }>("/v1/admin/csc-activity").then((r) => r.data),
  });

  const rows = data ?? [];

  const flaggedCount = rows.filter((r) => r.flaggedBySystem).length;
  const bulkCount = rows.filter((r) => r.bulkPatternFlag).length;
  const totalSubmissions = rows.reduce((a, r) => a + (r.totalSubmissions ?? 0), 0);
  const highRiskCount = rows.filter((r) => r.riskTier === "HIGH").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CSC Activity Monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">Daily operator submission patterns and fraud risk signals</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions", value: totalSubmissions, icon: TrendingUp, color: "bg-blue-600" },
          { label: "System Flagged", value: flaggedCount, icon: AlertTriangle, color: "bg-red-600" },
          { label: "Bulk Pattern", value: bulkCount, icon: Users, color: "bg-orange-600" },
          { label: "High Risk Entries", value: highRiskCount, icon: ShieldAlert, color: "bg-rose-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{isLoading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Daily Activity Log (last 30 entries)</span>
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> {flaggedCount} flagged
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Date", "Submissions", "Approved", "Rejected", "Review", "Farmers", "Districts", "Avg Score", "Bulk?", "Risk", "Flag"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(11)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No CSC activity recorded yet. Activity is tracked automatically when CSC operators file claims.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${r.flaggedBySystem ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-3 text-xs font-mono">{r.activityDate}</td>
                  <td className="px-4 py-3 font-semibold text-xs">{r.totalSubmissions}</td>
                  <td className="px-4 py-3 text-xs text-green-700">{r.approvedCount}</td>
                  <td className="px-4 py-3 text-xs text-red-600">{r.rejectedCount}</td>
                  <td className="px-4 py-3 text-xs text-yellow-700">{r.reviewCount}</td>
                  <td className="px-4 py-3 text-xs">{r.uniqueFarmers}</td>
                  <td className="px-4 py-3 text-xs">{r.uniqueDistricts}</td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {r.avgFraudScore ? Number(r.avgFraudScore).toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.bulkPatternFlag
                      ? <span className="text-xs font-semibold text-orange-600">YES</span>
                      : <span className="text-xs text-muted-foreground">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${riskColor(r.riskTier)}`}>
                      {r.riskTier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.flaggedBySystem
                      ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium" title={r.flagReason ?? ""}>
                          <AlertTriangle className="w-3 h-3" /> Flagged
                        </span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
