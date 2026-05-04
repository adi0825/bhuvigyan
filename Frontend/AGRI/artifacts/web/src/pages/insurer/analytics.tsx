import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, LogOut, TrendingUp, AlertTriangle, BarChart3, MapPin } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";

function insurerFetch<T>(path: string) {
  const token = localStorage.getItem("insurer_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

interface FraudTrends {
  timeSeries: Array<{ month: string; avgScore: number; claims: number }>;
  cscLeaderboard: Array<{ operatorId: string; name: string; state: string; fraudRate: number; totalClaims: number }>;
  districtHeatmap: Array<{ districtId: string; fraudRate: number; totalClaims: number }>;
  summary: { highRiskCount: number; avgFraudScore: number; totalFlaggedAmount: number };
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

export default function InsurerAnalytics() {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["insurer-analytics"],
    queryFn: () => insurerFetch<{ data: FraudTrends }>("/v1/insurer/analytics"),
  });

  const trends = data?.data;

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm">Bhuvigyan PMFBY</h1>
            <p className="text-xs text-muted-foreground">Insurer Portal — Fraud Trends</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/insurer/dashboard")} className="text-sm text-muted-foreground hover:text-foreground">Dashboard</button>
          <button onClick={() => navigate("/insurer/claims")} className="text-sm text-muted-foreground hover:text-foreground">All Claims</button>
          <button onClick={() => { localStorage.removeItem("insurer_token"); navigate("/insurer/login"); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h2 className="text-lg font-bold text-foreground">Fraud Intelligence Trends</h2>
          <p className="text-sm text-muted-foreground">Aggregate fraud analytics across all claims</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "High-Risk Claims", value: isLoading ? "—" : trends?.summary.highRiskCount ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
            { label: "Avg Fraud Score", value: isLoading ? "—" : Number(trends?.summary.avgFraudScore ?? 0).toFixed(1), icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Amount at Risk (₹)", value: isLoading ? "—" : `₹${Number(trends?.summary.totalFlaggedAmount ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{String(kpi.value)}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fraud Score Time Series */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Fraud Score Trend (Monthly)
          </h3>
          {isLoading ? (
            <div className="h-56 bg-muted rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trends?.timeSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgScore" stroke="#ef4444" strokeWidth={2} dot={false} name="Avg Fraud Score" />
                <Line type="monotone" dataKey="claims" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total Claims" yAxisId="right" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* CSC Operator Risk Leaderboard */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">CSC Operator Risk Leaderboard</h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(trends?.cscLeaderboard ?? []).slice(0, 8).map((op, i) => (
                  <div key={op.operatorId} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{op.name}</div>
                      <div className="text-xs text-muted-foreground">{op.state} · {op.totalClaims} claims</div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        op.fraudRate > 0.3 ? "bg-red-100 text-red-700" :
                        op.fraudRate > 0.15 ? "bg-orange-100 text-orange-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {(op.fraudRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                {(trends?.cscLeaderboard ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No operator data available</p>
                )}
              </div>
            )}
          </div>

          {/* District Heatmap Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> District Fraud Rate
            </h3>
            {isLoading ? (
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(trends?.districtHeatmap ?? []).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="districtId" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="fraudRate" radius={[0, 3, 3, 0]} name="Fraud Rate %">
                    {(trends?.districtHeatmap ?? []).slice(0, 10).map((entry, index) => (
                      <Cell key={index} fill={COLORS[Math.min(Math.floor(entry.fraudRate / 20), 4)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
