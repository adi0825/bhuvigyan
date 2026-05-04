import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, LogOut, Search, Filter, FileText, ChevronRight } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

function insurerFetch<T>(path: string) {
  const token = localStorage.getItem("insurer_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

const SCORE_BANDS = ["All", "Low (0-30)", "Medium (31-60)", "High (61-80)", "Critical (81-100)"];
const VERDICTS = ["All", "FILED", "OFFICER_REVIEW", "CCE_VISIT", "APPROVED", "AUTO_APPROVED", "REJECTED", "REJECTED_FRAUD"];

function scoreBand(score?: string | number | null) {
  const v = Number(score ?? -1);
  if (v < 0) return "unknown";
  if (v <= 30) return "Low";
  if (v <= 60) return "Medium";
  if (v <= 80) return "High";
  return "Critical";
}

function bandColor(band: string) {
  if (band === "Low") return "text-green-700 bg-green-50 border-green-200";
  if (band === "Medium") return "text-yellow-700 bg-yellow-50 border-yellow-200";
  if (band === "High") return "text-orange-700 bg-orange-50 border-orange-200";
  if (band === "Critical") return "text-red-700 bg-red-50 border-red-200";
  return "text-muted-foreground bg-muted border-border";
}

interface Claim {
  id: string; claimNumber: string; udlrn: string; status: string;
  declaredCrop: string; fraudScore?: string; approvedAmount?: number;
  claimAmountRequested?: number; filedAt: string;
}

export default function InsurerClaims() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bandFilter, setBandFilter] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["insurer-claims"],
    queryFn: () => insurerFetch<{ data: Claim[] }>("/v1/insurer/claims"),
  });

  const claims = data?.data ?? [];

  const filtered = claims.filter((c) => {
    const matchSearch = !search ||
      c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.udlrn.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    const band = scoreBand(c.fraudScore);
    const matchBand = bandFilter === "All" || bandFilter.startsWith(band);
    return matchSearch && matchStatus && matchBand;
  });

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
            <p className="text-xs text-muted-foreground">Insurer Portal — All Claims</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/insurer/dashboard")} className="text-sm text-muted-foreground hover:text-foreground">Dashboard</button>
          <button onClick={() => navigate("/insurer/analytics")} className="text-sm text-muted-foreground hover:text-foreground">Fraud Trends</button>
          <button onClick={() => { localStorage.removeItem("insurer_token"); navigate("/insurer/login"); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">All Claims</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} of {claims.length} claims</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by claim # or UDLRN..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
              {VERDICTS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <select value={bandFilter} onChange={(e) => setBandFilter(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background">
              {SCORE_BANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Claim #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">UDLRN</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Crop</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fraud Score</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount (₹)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Filed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No claims match filters
                    </td>
                  </tr>
                ) : filtered.map((c) => {
                  const band = scoreBand(c.fraudScore);
                  return (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{c.claimNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.udlrn}</td>
                      <td className="px-4 py-3 capitalize">{c.declaredCrop}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        {c.fraudScore ? (
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", bandColor(band))}>
                            {Number(c.fraudScore).toFixed(0)} · {band}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₹{Number(c.claimAmountRequested ?? 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(c.filedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/insurer/evidence/${c.id}`)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
