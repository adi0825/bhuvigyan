import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

interface Claim {
  id: string; claimNumber: string; udlrn: string; declaredCrop: string;
  damageType: string; status: string; fraudScore?: number; filedAt: string;
  fraudFlags?: string[];
}

function cscFetch<T>(path: string) {
  const token = localStorage.getItem("csc_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

export default function CscMyClaims() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["csc-claims"],
    queryFn: () => cscFetch<{ data: Claim[] }>("/v1/csc/my-claims"),
  });

  const claims = (data?.data ?? []).filter((c) =>
    filter === "TODAY"
      ? new Date(c.filedAt).toDateString() === new Date().toDateString()
      : filter === "FRAUD"
        ? (c.fraudFlags ?? []).length > 0
        : true,
  );

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 mt-8">
        <button onClick={() => navigate("/csc/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">My Claims ({claims.length})</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {["ALL", "TODAY", "FRAUD"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted")}>
              {f}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
          </div>
        )}

        <div className="space-y-2">
          {claims.map((c) => (
            <div key={c.id}
              className={cn("bg-card rounded-xl border p-3.5",
                (c.fraudFlags ?? []).length > 0 ? "border-red-200 bg-red-50/50" : "border-border")}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-foreground">{c.claimNumber}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {c.declaredCrop} · {c.udlrn}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.filedAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={c.status} />
                  {(c.fraudFlags ?? []).length > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                      ⚠ Flagged
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!isLoading && claims.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No claims found</div>
          )}
        </div>
      </div>
    </div>
  );
}
