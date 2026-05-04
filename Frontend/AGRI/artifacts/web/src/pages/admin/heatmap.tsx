import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { cn } from "@/lib/utils";

interface HeatmapEntry {
  districtId: string; districtName: string;
  lat?: number; lng?: number;
  totalClaims: number; fraudClaims: number;
  fraudRate: number; amountSaved: number;
}

const DAY_OPTIONS = [7, 14, 30, 60, 90];

function getFraudColor(rate: number): string {
  if (rate >= 40) return "#dc2626";
  if (rate >= 25) return "#ea580c";
  if (rate >= 15) return "#d97706";
  if (rate >= 5) return "#16a34a";
  return "#6b7280";
}

export default function FraudHeatmap() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["heatmap", days],
    queryFn: () => apiFetch<{ data: HeatmapEntry[] }>(`/v1/admin/heatmap?days=${days}`),
  });

  const entries = (data?.data ?? []).filter((e) => e.totalClaims > 0);
  const sorted = [...entries].sort((a, b) => b.fraudRate - a.fraudRate);
  const scatterData = entries.filter((e) => e.lat && e.lng).map((e) => ({
    x: e.lng, y: e.lat, z: e.totalClaims, name: e.districtName, rate: e.fraudRate,
  }));

  const totalFraud = entries.reduce((s, e) => s + e.fraudClaims, 0);
  const totalClaims = entries.reduce((s, e) => s + e.totalClaims, 0);
  const totalSaved = entries.reduce((s, e) => s + e.amountSaved, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fraud Heatmap</h1>
          <p className="text-sm text-muted-foreground mt-0.5">District-level fraud detection analysis</p>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
          {DAY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors",
                days === d ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Fraud Rate", value: `${totalClaims > 0 ? ((totalFraud / totalClaims) * 100).toFixed(1) : 0}%`, sub: `${totalFraud} of ${totalClaims} claims` },
          { label: "Fraud Claims", value: totalFraud.toLocaleString("en-IN"), sub: "Last " + days + " days" },
          { label: "Amount Saved", value: `₹${(totalSaved / 100000).toFixed(2)}L`, sub: "Fraudulent claims blocked" },
        ].map((k) => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4">
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
            <div className="text-sm font-medium text-foreground mt-0.5">{k.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bubble chart (lat/lng) */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Geographic Distribution</h2>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="x" name="Longitude" type="number" domain={["auto", "auto"]}
                  tickFormatter={(v) => v.toFixed(1)} tick={{ fontSize: 11 }} />
                <YAxis dataKey="y" name="Latitude" type="number" domain={["auto", "auto"]}
                  tickFormatter={(v) => v.toFixed(1)} tick={{ fontSize: 11 }} />
                <ZAxis dataKey="z" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload as { name: string; rate: number; z: number };
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
                        <div className="font-semibold">{d.name}</div>
                        <div>Claims: {d.z}</div>
                        <div>Fraud Rate: {Number(d.rate).toFixed(1)}%</div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} fill="#ef4444" shape={(props: { cx: number; cy: number; payload: { rate: number; z: number } }) => {
                  const { cx, cy, payload } = props;
                  return <circle cx={cx} cy={cy} r={Math.sqrt(payload.z) * 2} fill={getFraudColor(payload.rate)} fillOpacity={0.7} stroke="white" strokeWidth={1} />;
                }} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
              {isLoading ? "Loading..." : "No geographic data available"}
            </div>
          )}
        </div>

        {/* Top districts bar chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top Districts by Fraud Rate</h2>
          {sorted.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sorted.slice(0, 10)} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <YAxis type="category" dataKey="districtName" tick={{ fontSize: 11 }} width={75} />
                <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)}%`, "Fraud Rate"]} />
                <Bar dataKey="fraudRate" radius={[0, 4, 4, 0]}>
                  {sorted.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={getFraudColor(entry.fraudRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
              {isLoading ? "Loading..." : "No heatmap data for this period"}
            </div>
          )}
        </div>
      </div>

      {/* District table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">District-wise Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["District", "Total Claims", "Fraud Claims", "Fraud Rate", "Amount Saved"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))}
              {sorted.map((e) => (
                <tr key={e.districtId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{e.districtName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.totalClaims.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{e.fraudClaims.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.fraudRate)}%`, background: getFraudColor(e.fraudRate) }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: getFraudColor(e.fraudRate) }}>
                        {Number(e.fraudRate).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-green-700 font-medium">₹{(e.amountSaved / 1000).toFixed(0)}K</td>
                </tr>
              ))}
              {!isLoading && sorted.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
