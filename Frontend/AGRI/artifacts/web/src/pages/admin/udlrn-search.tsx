import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { FraudScoreBadge } from "@/components/fraud-score-badge";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { Search, Lock, MapPin, User, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UdlrnProfile {
  udlrn: string;
  farmer?: { id: string; mobile: string; fullName: string; isBlacklisted: boolean };
  land?: { landOwnerName?: string; landAreaHa?: number; landUseType?: string; centroidLat?: number; centroidLng?: number };
  claims: Array<{ id: string; claimNumber: string; status: string; fraudScore?: number; filedAt: string }>;
  isFrozen: boolean;
  frozenReason?: string;
  carbonScore?: number;
}

export default function UdlrnSearch() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["udlrn", searched],
    queryFn: () => apiFetch<{ data: UdlrnProfile }>(`/v1/admin/udlrn/${searched}`),
    enabled: !!searched,
  });

  const freezeMut = useMutation({
    mutationFn: () => apiFetch(`/v1/admin/udlrn/${searched}/freeze`, {
      method: "POST",
      body: JSON.stringify({ reason: freezeReason }),
    }),
    onSuccess: () => {
      toast({ title: "UDLRN frozen successfully" });
      qc.invalidateQueries({ queryKey: ["udlrn", searched] });
      setShowFreezeModal(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const profile = data?.data;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">UDLRN Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Look up any unique land reference number</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setSearched(query); }} className="flex gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 29-0572-A3F8C1-07"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
        </div>
        <button type="submit" className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90">
          Search
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Try demo:</span>
        {["29-0572-A3F8C1-07", "29-0585-B2E9D4-15", "27-0004-C1D7E5-23"].map((u) => (
          <button key={u} onClick={() => { setQuery(u); setSearched(u); }}
            className="text-xs font-mono text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary/5">
            {u}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-48 bg-muted rounded-xl animate-pulse" />}

      {error && searched && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">
          UDLRN not found: {(error as Error).message}
        </div>
      )}

      {profile && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold font-mono text-foreground">{profile.udlrn}</div>
                  {profile.isFrozen && (
                    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                      <Lock className="w-3 h-3" /> FROZEN
                    </span>
                  )}
                </div>
                {profile.isFrozen && profile.frozenReason && (
                  <p className="text-xs text-red-600 mt-1">Reason: {profile.frozenReason}</p>
                )}
              </div>
              {!profile.isFrozen && (
                <button onClick={() => setShowFreezeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-destructive text-destructive text-sm rounded-lg hover:bg-destructive/5">
                  <Lock className="w-4 h-4" /> Freeze UDLRN
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {profile.farmer && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="w-4 h-4" /> Farmer</h2>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{profile.farmer.fullName}</div>
                  <div className="font-mono text-muted-foreground">{profile.farmer.mobile}</div>
                  {profile.farmer.isBlacklisted && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Blacklisted</span>
                  )}
                </div>
              </div>
            )}

            {profile.land && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Land</h2>
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{profile.land.landOwnerName ?? "—"}</div>
                  <div className="text-muted-foreground">{profile.land.landAreaHa} Ha · <span className="capitalize">{profile.land.landUseType}</span></div>
                  {profile.land.centroidLat && (
                    <div className="font-mono text-xs text-muted-foreground">{Number(profile.land.centroidLat).toFixed(4)}, {Number(profile.land.centroidLng).toFixed(4)}</div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Carbon Score</h2>
              <div className="text-3xl font-bold text-primary">{profile.carbonScore ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Carbon credit eligibility score</div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Claims History ({profile.claims.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Claim No.", "Status", "Fraud Score", "Filed Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profile.claims.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{c.claimNumber}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><FraudScoreBadge score={c.fraudScore} size="sm" /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.filedAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/claims/${c.id}`} className="text-xs text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {profile.claims.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">No claims for this UDLRN</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showFreezeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Freeze UDLRN: {searched}</h3>
            <p className="text-sm text-muted-foreground">This will prevent any new claims from being filed for this land parcel.</p>
            <textarea value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} rows={3} required
              placeholder="Reason for freezing..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowFreezeModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={() => freezeMut.mutate()} disabled={freezeMut.isPending || !freezeReason}
                className="px-4 py-2 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50">
                {freezeMut.isPending ? "Freezing..." : "Confirm Freeze"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
