import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string; claimId?: string; udlrn?: string;
  stepName: string; actorId: string; actorType: string;
  decisionReason?: string; createdAt: string;
}

const STEP_COLORS: Record<string, string> = {
  CLAIM_FILED: "bg-blue-100 text-blue-700",
  LAND_VERIFIED: "bg-cyan-100 text-cyan-700",
  SATELLITE_PROCESSED: "bg-purple-100 text-purple-700",
  FRAUD_SCORED: "bg-indigo-100 text-indigo-700",
  VERDICT_ISSUED: "bg-green-100 text-green-700",
  CLAIM_APPROVED: "bg-green-100 text-green-700",
  CLAIM_REJECTED: "bg-red-100 text-red-700",
  CCE_SCHEDULED: "bg-orange-100 text-orange-700",
  FIR_ALERT_SENT: "bg-red-100 text-red-800",
  APPEAL_SUBMITTED: "bg-violet-100 text-violet-700",
  UDLRN_FROZEN: "bg-red-100 text-red-700",
};

export default function AuditLog() {
  const [udlrnFilter, setUdlrnFilter] = useState("");
  const [claimFilter, setClaimFilter] = useState("");
  const [searched, setSearched] = useState<{ udlrn?: string; claimId?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", searched],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (searched.udlrn) params.set("udlrn", searched.udlrn);
      if (searched.claimId) params.set("claimId", searched.claimId);
      return apiFetch<{ data: AuditEntry[] }>(`/v1/admin/audit-log?${params}`);
    },
  });

  const entries = data?.data ?? [];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Complete decision trail for claims and UDLRN operations</p>
      </div>

      {/* Filters */}
      <form onSubmit={(e) => { e.preventDefault(); setSearched({ udlrn: udlrnFilter || undefined, claimId: claimFilter || undefined }); }}
        className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={udlrnFilter} onChange={(e) => setUdlrnFilter(e.target.value)}
            placeholder="Filter by UDLRN..."
            className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-64 font-mono" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={claimFilter} onChange={(e) => setClaimFilter(e.target.value)}
            placeholder="Filter by claim ID..."
            className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-72 font-mono" />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90">
          Search
        </button>
        {(searched.udlrn || searched.claimId) && (
          <button type="button" onClick={() => { setSearched({}); setUdlrnFilter(""); setClaimFilter(""); }}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted">
            Clear
          </button>
        )}
      </form>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Timestamp", "Step", "Actor", "Claim / UDLRN", "Reason"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))}
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium rounded-full px-2 py-0.5", STEP_COLORS[e.stepName] ?? "bg-gray-100 text-gray-600")}>
                      {e.stepName.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-foreground">{e.actorType}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-32">{e.actorId}</div>
                  </td>
                  <td className="px-4 py-3">
                    {e.udlrn && <div className="text-xs font-mono text-primary">{e.udlrn}</div>}
                    {e.claimId && <div className="text-xs font-mono text-muted-foreground truncate max-w-32">{e.claimId}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">{e.decisionReason ?? "—"}</td>
                </tr>
              ))}
              {!isLoading && entries.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  {Object.keys(searched).length > 0 ? "No audit entries found" : "Search by UDLRN or Claim ID to view audit entries"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {entries.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">{entries.length} entries</div>
        )}
      </div>
    </div>
  );
}
