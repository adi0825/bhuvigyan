import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { FraudScoreBadge } from "@/components/fraud-score-badge";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Claim {
  id: string; claimNumber: string; udlrn: string; farmerName?: string;
  declaredCrop: string; damageType: string; fraudScore: number | null;
  fraudFlags: string[] | null; status: string; filedAt: string;
}

const STATUS_FILTERS = [
  { value: "", label: "All Pending" },
  { value: "OFFICER_REVIEW", label: "Officer Review" },
  { value: "CCE_VISIT", label: "CCE Visit" },
  { value: "APPEALED", label: "Appealed" },
];

export default function ReviewQueue() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["review-queue", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      return apiFetch<{ data: { items: Claim[]; total: number; page: number; limit: number } }>(
        `/v1/admin/review-queue?${params}`,
      );
    },
  });

  const items = data?.data.items ?? [];
  const total = data?.data.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search
    ? items.filter((c) =>
        c.claimNumber.includes(search) ||
        c.udlrn?.includes(search) ||
        c.declaredCrop?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} claims pending review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search claim number, UDLRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">UDLRN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crop / Damage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fraud Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flags</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && filtered.map((claim) => (
                <tr key={claim.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{claim.claimNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{claim.udlrn}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground capitalize">{claim.declaredCrop}</div>
                    <div className="text-xs text-muted-foreground capitalize">{claim.damageType?.toLowerCase()}</div>
                  </td>
                  <td className="px-4 py-3"><FraudScoreBadge score={claim.fraudScore} size="sm" /></td>
                  <td className="px-4 py-3">
                    {(claim.fraudFlags ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(claim.fraudFlags ?? []).slice(0, 2).map((f) => (
                          <span key={f} className="text-xs bg-orange-100 text-orange-700 rounded px-1.5 py-0.5">
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                        {(claim.fraudFlags ?? []).length > 2 && (
                          <span className="text-xs text-muted-foreground">+{(claim.fraudFlags ?? []).length - 2}</span>
                        )}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">None</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(claim.filedAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/claims/${claim.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No claims in queue
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} total)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
