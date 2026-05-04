import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, Shield, AlertTriangle, BadgeDollarSign } from "lucide-react";

interface AnalyticsData {
  dailyClaims: Array<{ date: string; total: number; fraud: number; approved: number }>;
  statePerformance: Array<{ stateCode: string; stateName: string; total: number; fraudRate: number; avgScore: number }>;
  flagFrequency: Array<{ flag: string; count: number }>;
  modelMetrics: { accuracy: number; precision: number; recall: number; f1: number; totalScored: number };
  totalSavedAllTime: number; fraudRateAllTime: number; totalClaimsAllTime: number;
}

const TIME_FILTERS = [
  { label: "7D", days: 7 }, { label: "30D", days: 30 }, { label: "90D", days: 90 }, { label: "1Y", days: 365 },
];

const COLORS = ["#dc2626", "#ea580c", "#d97706", "#16a34a", "#0ea5e9", "#8b5cf6"];

export default function Analytics() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", days],
    queryFn: () => apiFetch<{ data: AnalyticsData }>(`/v1/admin/analytics?days=${days}`),
  });

  const d = data?.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI model performance and fraud trends</p>
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {TIME_FILTERS.map((f) => (
            <button key={f.days} onClick={() => setDays(f.days)}
              className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors",
                days === f.days ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: "Total Claims", value: (d?.totalClaimsAllTime ?? 0).toLocaleString("en-IN"), color: "bg-blue-600" },
          { icon: Shield, label: "Fraud Rate", value: `${((d?.fraudRateAllTime ?? 0) * 100).toFixed(1)}%`, color: "bg-red-600" },
          { icon: BadgeDollarSign, label: "Amount Saved", value: `₹${((d?.totalSavedAllTime ?? 0) / 100000).toFixed(1)}L`, color: "bg-green-600" },
          { icon: AlertTriangle, label: "F1 Score", value: d?.modelMetrics ? `${(d.modelMetrics.f1 * 100).toFixed(0)}%` : "—", color: "bg-purple-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{isLoading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 30-day trends line chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Claims Trend ({days} days)</h2>
        {isLoading ? <div className="h-60 bg-muted rounded-lg animate-pulse" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={d?.dailyClaims ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="fraud" stroke="#dc2626" strokeWidth={2} dot={false} name="Fraud" />
              <Line type="monotone" dataKey="approved" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Approved" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* State-wise performance */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">State-wise Fraud Rate</h2>
          {isLoading ? <div className="h-52 bg-muted rounded-lg animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d?.statePerformance ?? []} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stateName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Fraud Rate"]} />
                <Bar dataKey="fraudRate" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fraud flag frequency */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top Fraud Flags</h2>
          {isLoading ? <div className="h-52 bg-muted rounded-lg animate-pulse" /> : (d?.flagFrequency ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={(d?.flagFrequency ?? []).slice(0, 6)} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="flag">
                  {(d?.flagFrequency ?? []).slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [v, String(name).replace(/_/g, " ")]} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v.replace(/_/g, " ")}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No flag data available</div>}
        </div>
      </div>

      {/* ML Model Metrics */}
      {d?.modelMetrics && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">AI Model Performance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Accuracy", value: d.modelMetrics.accuracy, color: "text-green-700" },
              { label: "Precision", value: d.modelMetrics.precision, color: "text-blue-700" },
              { label: "Recall", value: d.modelMetrics.recall, color: "text-orange-700" },
              { label: "F1 Score", value: d.modelMetrics.f1, color: "text-purple-700" },
            ].map((m) => (
              <div key={m.label} className="text-center bg-muted/50 rounded-lg p-4">
                <div className={cn("text-3xl font-bold", m.color)}>{(m.value * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground mt-1">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground text-center">
            Based on {d.modelMetrics.totalScored.toLocaleString("en-IN")} scored claims · Model: XGBoost v2.1 + IsolationForest
          </div>
        </div>
      )}
    </div>
  );
}
