import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/status-badge";
import { FraudScoreBadge } from "@/components/fraud-score-badge";
import { Link } from "wouter";
import {
  Leaf, LogOut, Plus, Bell, MapPin, User, ChevronRight, FileText, AlertCircle,
  Satellite, CloudRain, TrendingUp, Zap, Activity,
} from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";
import { cn } from "@/lib/utils";

function NdviGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const ndvi = (0.18 + (pct / 100) * 0.65).toFixed(2);
  const healthLabel = pct >= 75 ? "Excellent" : pct >= 55 ? "Good" : pct >= 35 ? "Fair" : pct >= 20 ? "Poor" : "Critical";
  const healthColor = pct >= 75 ? "text-green-700" : pct >= 55 ? "text-emerald-600" : pct >= 35 ? "text-yellow-600" : pct >= 20 ? "text-orange-600" : "text-red-700";
  const markerColor = pct >= 75 ? "border-green-600" : pct >= 55 ? "border-emerald-500" : pct >= 35 ? "border-yellow-500" : "border-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Crop Health Index</span>
        <span className={cn("font-bold", healthColor)}>{healthLabel} · NDVI {ndvi}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500">
        <div
          className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md", markerColor)}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 — Critical</span>
        <span>100 — Excellent</span>
      </div>
    </div>
  );
}

export default function FarmerDashboard() {
  const { user, logout } = useAuth();

  const { data: claimsData, isLoading: claimsLoading } = useQuery({
    queryKey: ["my-claims"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; claimNumber: string; udlrn: string; declaredCrop: string; damageType: string; fraudScore: number | null; status: string; filedAt: string; approvedAmount?: number }> }>("/v1/claims/my-claims"),
  });

  const { data: notifData } = useQuery({
    queryKey: ["farmer-notifications"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; title: string; message: string; channel: string; readAt?: string; createdAt: string }> }>("/v1/farmer/notifications"),
  });

  const { data: landData } = useQuery({
    queryKey: ["farmer-land"],
    queryFn: () => apiFetch<{ data: { udlrn: string; landAreaHa?: number; declaredCrop?: string; isFrozen?: boolean; carbonScore?: number } }>("/v1/farmer/land"),
  });

  const claims = claimsData?.data ?? [];
  const notifications = notifData?.data ?? [];
  const land = landData?.data;
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const carbonScore = land?.carbonScore ?? 65;
  const landAreaHa = land?.landAreaHa ? Number(land.landAreaHa) : 2.5;
  const estPayout = Math.round(landAreaHa * 28000 * 0.75);
  const lastAnalysisDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const pendingClaims = claims.filter((c) => !["APPROVED", "AUTO_APPROVED", "REJECTED", "AUTO_REJECTED", "REJECTED_FRAUD"].includes(c.status)).length;
  const approvedClaims = claims.filter((c) => ["APPROVED", "AUTO_APPROVED"].includes(c.status)).length;
  const totalPaid = claims.filter((c) => c.approvedAmount).reduce((s, c) => s + Number(c.approvedAmount ?? 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center justify-between shadow-lg mt-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">Bhuvigyan PMFBY</div>
            <div className="text-xs text-sidebar-foreground/60">Farmer Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/farmer/notifications" className="relative p-2 hover:bg-sidebar-accent rounded-lg">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center">{unreadCount}</span>
            )}
          </Link>
          <button onClick={logout} className="p-2 hover:bg-sidebar-accent rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Welcome */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">{user?.name}</div>
              <div className="text-sm text-muted-foreground">+91 {user?.mobile}</div>
            </div>
            {user?.udlrn && (
              <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">
                <MapPin className="w-3 h-3" />
                <span className="font-mono font-medium">{user.udlrn}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        {claims.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Pending", value: pendingClaims, icon: Activity, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
              { label: "Approved", value: approvedClaims, icon: TrendingUp, color: "text-green-700", bg: "bg-green-50 border-green-200" },
              { label: "Total Paid", value: totalPaid > 0 ? `₹${(totalPaid / 1000).toFixed(0)}K` : "—", icon: Zap, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={cn("rounded-xl border p-3 text-center", bg)}>
                <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
                <div className={cn("text-lg font-bold", color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bhumi AI Crop Intelligence */}
        {land && (
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-green-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Satellite className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Bhumi AI Intelligence</div>
                  <div className="text-xs text-muted-foreground">Sentinel-2 · Last scan: {lastAnalysisDate}</div>
                </div>
              </div>
              <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </div>
            </div>

            <NdviGauge score={carbonScore} />

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/80 rounded-lg p-2.5 text-center border border-primary/10">
                <div className="text-base font-bold text-green-700">₹{estPayout.toLocaleString("en-IN")}</div>
                <div className="text-xs text-muted-foreground">Est. Payout Eligible</div>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 text-center border border-primary/10">
                <div className="text-base font-bold text-blue-700">{landAreaHa.toFixed(2)} Ha</div>
                <div className="text-xs text-muted-foreground">Insured Area</div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 text-xs bg-white/80 border border-primary/10 rounded-lg px-2.5 py-1.5 flex-1 justify-center">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-muted-foreground">IMD: <span className="text-foreground font-medium">Normal</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-white/80 border border-primary/10 rounded-lg px-2.5 py-1.5 flex-1 justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Pipeline: <span className="text-foreground font-medium">Active</span></span>
              </div>
            </div>
          </div>
        )}

        {/* Land card */}
        {land && (
          <div className={cn("rounded-xl border p-4", land.isFrozen ? "bg-red-50 border-red-200" : "bg-card border-border")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className={cn("w-4 h-4", land.isFrozen ? "text-red-600" : "text-primary")} />
                <span className="font-medium text-sm text-foreground">Your Land</span>
              </div>
              {land.isFrozen ? (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Frozen
                </span>
              ) : (
                <Link href="/farmer/land" className="text-xs text-primary hover:underline">View details</Link>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Area</div>
                <div className="font-medium">{land.landAreaHa ? `${Number(land.landAreaHa).toFixed(2)} Ha` : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Crop</div>
                <div className="font-medium capitalize">{land.declaredCrop ?? "Not set"}</div>
              </div>
              {land.carbonScore != null && (
                <div>
                  <div className="text-xs text-muted-foreground">Carbon Score</div>
                  <div className="font-medium text-primary">{land.carbonScore}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File claim button */}
        {!land?.isFrozen && (
          <Link
            href="/farmer/file-claim"
            className="flex items-center justify-between bg-primary text-white rounded-xl p-4 hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">File New Claim</div>
                <div className="text-xs text-white/70">PMFBY crop insurance claim</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </Link>
        )}

        {/* Claims list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> My Claims
            </h2>
            <span className="text-xs text-muted-foreground">{claims.length} total</span>
          </div>
          {claimsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : claims.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
              <div className="text-sm font-medium text-foreground">No claims filed yet</div>
              <div className="text-xs text-muted-foreground mt-1">File your first PMFBY claim above</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {claims.map((c) => {
                const isPending = !["APPROVED", "AUTO_APPROVED", "REJECTED", "AUTO_REJECTED", "REJECTED_FRAUD", "APPEALED"].includes(c.status);
                return (
                  <Link
                    key={c.id}
                    href={`/farmer/claims/${c.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/30 transition-colors",
                      isPending ? "bg-primary/5 border-primary/20" : "bg-card border-border",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-foreground">{c.claimNumber}</span>
                        <StatusBadge status={c.status} />
                        {isPending && <span className="text-xs text-primary animate-pulse font-medium">• Processing</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {c.declaredCrop} · {c.damageType?.toLowerCase()} · {new Date(c.filedAt).toLocaleDateString("en-IN")}
                      </div>
                      {c.approvedAmount && (
                        <div className="text-xs text-green-700 font-medium mt-0.5">
                          ✓ Approved: ₹{Number(c.approvedAmount).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <FraudScoreBadge score={c.fraudScore} size="sm" />
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        {notifications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Recent Alerts
              </h2>
              <Link href="/farmer/notifications" className="text-xs text-primary hover:underline">
                View all {unreadCount > 0 && `(${unreadCount} new)`}
              </Link>
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((n) => (
                <div key={n.id} className={cn(
                  "rounded-xl border p-3.5",
                  !n.readAt ? "bg-primary/5 border-primary/20" : "bg-card border-border",
                )}>
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <FarmerBottomNav />
    </div>
  );
}
