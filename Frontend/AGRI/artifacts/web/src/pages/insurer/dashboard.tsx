import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Building2, LogOut, TrendingUp, Shield, CheckCircle2, XCircle, FileSearch,
  BarChart3, Target, Percent, RefreshCw, AlertTriangle,
} from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { StatusBadge } from "@/components/status-badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

function insurerFetch<T>(path: string) {
  const token = localStorage.getItem("insurer_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

interface InsurerDashboard {
  totalClaims: number; approvedClaims: number; rejectedClaims: number; pendingClaims: number;
  totalApprovedAmount: number; totalSaved: number; fraudRate: number;
  recentClaims: Array<{ id: string; claimNumber: string; udlrn: string; status: string; declaredCrop: string; approvedAmount?: number; fraudScore?: string; filedAt: string }>;
  weeklyTrend: Array<{ date: string; claims: number; approved: number }>;
}

function scoreBadge(score?: string) {
  const v = Number(score ?? 0);
  if (!score) return <span className="text-xs text-muted-foreground">—</span>;
  const color = v >= 61 ? "text-red-600 bg-red-50" : v >= 31 ? "text-yellow-700 bg-yellow-50" : "text-green-700 bg-green-50";
  return <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${color}`}>{v}/100</span>;
}

function GaugeBar({ label, value, max = 100, color, sublabel }: { label: string; value: number; max?: number; color: string; sublabel?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color.includes("green") ? "bg-green-500" : color.includes("blue") ? "bg-blue-500" : color.includes("orange") ? "bg-orange-500" : "bg-purple-500"}`}
          style={{ width: `${pct}%` }} />
      </div>
      {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}

export default function InsurerDashboard() {
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem("insurer_user") ?? "{}") as { insurerName?: string; insurerCode?: string };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["insurer-dashboard"],
    queryFn: () => insurerFetch<{ data: InsurerDashboard }>("/v1/insurer/dashboard"),
    refetchInterval: 60000,
  });

  function logout() {
    localStorage.removeItem("insurer_token");
    localStorage.removeItem("insurer_user");
    navigate("/insurer/login");
  }

  const d = data?.data;

  const approvalRate = d && d.totalClaims > 0 ? (d.approvedClaims / d.totalClaims) * 100 : 0;
  const settlementRate = d && (d.approvedClaims + d.rejectedClaims) > 0
    ? (d.approvedClaims / (d.approvedClaims + d.rejectedClaims)) * 100 : 0;
  const fraudDetectionRate = d ? (1 - d.fraudRate) * 100 : 0;
  const fraudSavingsRoi = d && d.totalApprovedAmount > 0
    ? ((d.totalSaved / (d.totalApprovedAmount + d.totalSaved)) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="bg-blue-700 text-white px-4 py-4 flex items-center justify-between mt-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">{user.insurerName ?? "Insurer Portal"}</div>
            <div className="text-xs text-blue-200">{user.insurerCode}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/insurer/claims")} className="text-sm text-blue-200 hover:text-white px-2 py-1 rounded">
            All Claims
          </button>
          <button onClick={() => navigate("/insurer/analytics")} className="text-sm text-blue-200 hover:text-white px-2 py-1 rounded">
            Fraud Trends
          </button>
          <button onClick={() => refetch()} disabled={isFetching} className="p-2 hover:bg-blue-600 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={logout} className="p-2 hover:bg-blue-600 rounded-lg"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Claims", value: d?.totalClaims ?? 0, icon: TrendingUp, color: "bg-blue-600" },
            { label: "Approved", value: d?.approvedClaims ?? 0, icon: CheckCircle2, color: "bg-green-600" },
            { label: "Pending Review", value: d?.pendingClaims ?? 0, icon: AlertTriangle, color: "bg-yellow-500" },
            { label: "Fraud Detected", value: `${((d?.fraudRate ?? 0) * 100).toFixed(1)}%`, icon: Shield, color: "bg-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{isLoading ? "—" : value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Total Approved Payouts
            </div>
            <div className="text-2xl font-bold text-green-700">₹{((d?.totalApprovedAmount ?? 0) / 100000).toFixed(2)}L</div>
            <div className="text-xs text-muted-foreground mt-1">{d?.approvedClaims ?? 0} successful claims</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> Fraud Savings
            </div>
            <div className="text-2xl font-bold text-blue-700">₹{((d?.totalSaved ?? 0) / 100000).toFixed(2)}L</div>
            <div className="text-xs text-green-600 mt-1 font-medium">ROI: {fraudSavingsRoi.toFixed(1)}% claims blocked</div>
          </div>
        </div>

        {/* Actuarial Intelligence */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Actuarial Intelligence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <GaugeBar
              label="Approval Rate"
              value={approvalRate}
              color="text-green-700"
              sublabel={`${d?.approvedClaims ?? 0} of ${d?.totalClaims ?? 0} claims`}
            />
            <GaugeBar
              label="Settlement Efficiency"
              value={settlementRate}
              color="text-blue-700"
              sublabel="Approved / (Approved + Rejected)"
            />
            <GaugeBar
              label="Fraud Detection Rate"
              value={fraudDetectionRate}
              color="text-orange-600"
              sublabel="Legitimate claims passed"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border">
            {[
              { label: "Avg Claim Payout", value: d && d.approvedClaims > 0 ? `₹${(d.totalApprovedAmount / d.approvedClaims / 1000).toFixed(0)}K` : "—", icon: Target, color: "text-green-700" },
              { label: "Fraud Savings / Claim", value: d && d.rejectedClaims > 0 ? `₹${(d.totalSaved / Math.max(1, d.rejectedClaims) / 1000).toFixed(0)}K` : "—", icon: Percent, color: "text-blue-700" },
              { label: "Pipeline Processed", value: d ? `${d.totalClaims - (d.pendingClaims ?? 0)}` : "—", icon: CheckCircle2, color: "text-purple-700" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly trend */}
        {(d?.weeklyTrend ?? []).length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> 7-Day Claims Intelligence
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={d?.weeklyTrend ?? []} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v, n) => [v, n === "claims" ? "Total Filed" : "Approved"]}
                />
                <Legend formatter={(v) => v === "claims" ? "Total Filed" : "Approved"} iconSize={10} />
                <Area type="monotone" dataKey="claims" stroke="#3b82f6" strokeWidth={2} fill="url(#totalGrad)" />
                <Area type="monotone" dataKey="approved" stroke="#16a34a" strokeWidth={2} fill="url(#approvedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent claims table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Recent Claims</span>
            <span className="text-xs text-muted-foreground font-normal">Live · auto-refresh 60s</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Claim #", "UDLRN", "Crop", "Status", "Fraud Score", "Amount", "Filed", "Evidence"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
                ))}
                {(d?.recentClaims ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium whitespace-nowrap">{c.claimNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{c.udlrn}</td>
                    <td className="px-4 py-3 capitalize text-xs">{c.declaredCrop}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">{scoreBadge(c.fraudScore)}</td>
                    <td className="px-4 py-3 text-xs font-medium">{c.approvedAmount ? `₹${Number(c.approvedAmount).toLocaleString("en-IN")}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(c.filedAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/insurer/evidence/${c.id}`)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        <FileSearch className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && (d?.recentClaims ?? []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No claims found for this insurer account</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
