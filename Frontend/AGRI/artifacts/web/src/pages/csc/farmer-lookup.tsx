import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { cn } from "@/lib/utils";

interface FarmerResult {
  udlrn: string; farmerId: string; fullName: string; mobile: string;
  landAreaHa?: number; landOwnerName?: string; surveyNumber?: string;
  isFrozen?: boolean; frozenReason?: string; isBlacklisted?: boolean;
  carbonEligible?: boolean; stateCode?: string;
}

export default function CscFarmerLookup() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<FarmerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const token = localStorage.getItem("csc_token");
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${base}/api/v1/csc/farmer-lookup?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message ?? "Not found");
      setResult(json.data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const canFile = result && !result.isFrozen && !result.isBlacklisted;

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 mt-8">
        <button onClick={() => navigate("/csc/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">Farmer Lookup</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <form onSubmit={search} className="flex gap-2">
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="UDLRN (e.g. 29-0572-A3F8C1-07) or mobile (9XXXXXXXXX)"
            className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
          />
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>

        {loading && <div className="h-40 bg-muted rounded-xl animate-pulse" />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        {result && (
          <div className="bg-card rounded-xl border border-border space-y-0 overflow-hidden">
            {/* Status banner */}
            {result.isFrozen && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" /> UDLRN Frozen — {result.frozenReason}
              </div>
            )}
            {result.isBlacklisted && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" /> Farmer Blacklisted — Cannot file claims
              </div>
            )}
            {canFile && (
              <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" /> Verified — Eligible to file claim
              </div>
            )}

            {/* Details */}
            <div className="p-4 space-y-2.5 text-sm">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Farmer Details</div>
              {[
                { label: "Full Name", value: result.fullName },
                { label: "Mobile", value: result.mobile },
                { label: "UDLRN", value: <span className="font-mono text-xs">{result.udlrn}</span> },
                { label: "Land Owner", value: result.landOwnerName },
                { label: "Area", value: result.landAreaHa ? `${result.landAreaHa} Ha` : "—" },
                { label: "Survey No.", value: result.surveyNumber ?? "—" },
                { label: "State", value: result.stateCode ?? "—" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-start">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Action */}
            <div className="px-4 pb-4">
              {canFile ? (
                <button
                  onClick={() => navigate(`/csc/claim/new/${result.udlrn}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
                >
                  <FileText className="w-4 h-4" /> File Claim for This Farmer
                </button>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {result.isFrozen ? "UDLRN is frozen — claim cannot be filed" : "Farmer is blacklisted — claim cannot be filed"}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <strong>Demo UDLRNs:</strong> 29-0572-A3F8C1-07 · 29-0585-B2E9D4-15 · 27-0004-C1D7E5-23
        </div>
      </div>
    </div>
  );
}
