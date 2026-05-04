import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapPin, LogOut, BarChart3, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

function inspectorFetch<T>(path: string) {
  const token = localStorage.getItem("inspector_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

interface InspectorAnalytics {
  scoreDistribution: Array<{ band: string; count: number }>;
  districtHeatmap: Array<{ districtId: string; fraudRate: number; totalClaims: number }>;
  operatorRisk: Array<{ operatorId: string; name: string; fraudRate: number; totalClaims: number }>;
  summary: { totalAssigned: number; completed: number; pendingReview: number; avgScore: number };
}

const BAND_COLORS: Record<string, string> = {
  "Low (0-30)": "#22c55e",
  "Medium (31-60)": "#eab308",
  "High (61-80)": "#f97316",
  "Critical (81-100)": "#ef4444",
};

export default function InspectorAnalytics() {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["inspector-analytics"],
    queryFn: () => inspectorFetch<{ data: InspectorAnalytics }>("/v1/inspector/analytics"),
  });

  const analytics = data?.data;

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm">Bhuvigyan PMFBY</h1>
            <p className="text-xs text-muted-foreground">Inspector Portal — Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/inspector/assignments")} className="text-sm text-muted-foreground hover:text-foreground">My Assignments</button>
          <button onClick={() => { localStorage.removeItem("inspector_token"); navigate("/inspector/login"); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h2 className="text-lg font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">District heatmap, score distribution &amp; operator risk</p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Assigned", value: analytics?.summary.totalAssigned ?? 0, icon: MapPin, color: "text-primary" },
            { label: "Completed", value: analytics?.summary.completed ?? 0, icon: TrendingUp, color: "text-green-600" },
            { label: "Pending Review", value: analytics?.summary.pendingReview ?? 0, icon: AlertTriangle, color: "text-orange-600" },
            { label: "Avg Fraud Score", value: Number(analytics?.summary.avgScore ?? 0).toFixed(1), icon: BarChart3, color: "text-red-600" },
          ].map((kpi) => (
            <div key={kpi.label} className={cn(
              "bg-card border border-border rounded-xl p-4 flex items-center gap-3",
              isLoading && "animate-pulse"
            )}>
              <kpi.icon className={cn("w-5 h-5 flex-shrink-0", kpi.color)} />
              <div>
                <div className="text-xl font-bold text-foreground">{isLoading ? "—" : String(kpi.value)}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Score Distribution Histogram */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Score Distribution
            </h3>
            {isLoading ? (
              <div className="h-52 bg-muted rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics?.scoreDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="band" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Claims">
                    {(analytics?.scoreDistribution ?? []).map((entry, i) => (
                      <Cell key={i} fill={BAND_COLORS[entry.band] ?? "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* District Heatmap */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> District Fraud Rate
            </h3>
            {isLoading ? (
              <div className="h-52 bg-muted rounded-lg animate-pulse" />
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {(analytics?.districtHeatmap ?? []).map((d) => (
                  <div key={d.districtId} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 truncate">{d.districtId}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(d.fraudRate * 100, 100)}%`,
                          background: d.fraudRate > 0.3 ? "#ef4444" : d.fraudRate > 0.15 ? "#f97316" : "#22c55e",
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right">{(d.fraudRate * 100).toFixed(0)}%</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">{d.totalClaims} claims</span>
                  </div>
                ))}
                {(analytics?.districtHeatmap ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No district data available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Operator Risk Table */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> CSC Operator Risk Table
          </h3>
          {isLoading ? (
            <div className="h-40 bg-muted rounded-lg animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium text-muted-foreground">Operator</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Total Claims</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Fraud Rate</th>
                    <th className="text-left pb-2 font-medium text-muted-foreground">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.operatorRisk ?? []).map((op) => (
                    <tr key={op.operatorId} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium">{op.name}</td>
                      <td className="py-2.5 text-right">{op.totalClaims}</td>
                      <td className="py-2.5 text-right font-mono">{(op.fraudRate * 100).toFixed(1)}%</td>
                      <td className="py-2.5">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", {
                          "bg-red-100 text-red-700": op.fraudRate > 0.3,
                          "bg-orange-100 text-orange-700": op.fraudRate > 0.15 && op.fraudRate <= 0.3,
                          "bg-green-100 text-green-700": op.fraudRate <= 0.15,
                        })}>
                          {op.fraudRate > 0.3 ? "High Risk" : op.fraudRate > 0.15 ? "Medium Risk" : "Low Risk"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(analytics?.operatorRisk ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">No operator data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
