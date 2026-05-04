import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Shield, Search, FileText, LogOut, AlertTriangle, ChevronRight,
  Clock, TrendingUp, Activity, Award,
} from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

function useCscAuth() {
  const token = localStorage.getItem("csc_token");
  const user = JSON.parse(localStorage.getItem("csc_user") ?? "null");
  return { token, user };
}

function cscFetch<T>(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("csc_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.message ?? "Request failed");
    return j as T;
  });
}

const QUOTA_LIMIT = 50;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
}

const STATUS_COLORS: Record<string, string> = {
  FILED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  AUTO_APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  REJECTED_FRAUD: "bg-red-100 text-red-700",
  OFFICER_REVIEW: "bg-yellow-100 text-yellow-700",
  CCE_VISIT: "bg-purple-100 text-purple-700",
};

export default function CscDashboard() {
  const [, navigate] = useLocation();
  const { user } = useCscAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["csc-dashboard"],
    queryFn: () => cscFetch<{
      data: {
        todayCount: number; weekCount: number; totalCount: number; fraudFlaggedCount: number;
        recentClaims: Array<{ id: string; claimNumber: string; status: string; declaredCrop: string; filedAt: string; fraudFlags?: string[]; udlrn?: string; damageType?: string }>;
      }
    }>("/v1/csc/dashboard"),
    refetchInterval: 30000,
  });

  function logout() {
    localStorage.removeItem("csc_token");
    localStorage.removeItem("csc_user");
    navigate("/csc/login");
  }

  const d = data?.data;
  const today = d?.todayCount ?? 0;
  const quotaPct = Math.min(100, (today / QUOTA_LIMIT) * 100);
  const nearLimit = today >= 45;
  const atLimit = today >= QUOTA_LIMIT;
  const remaining = QUOTA_LIMIT - today;

  const approvedToday = (d?.recentClaims ?? []).filter((c) =>
    ["APPROVED", "AUTO_APPROVED"].includes(c.status) &&
    new Date(c.filedAt).toDateString() === new Date().toDateString()
  ).length;

  const quotaBarColor = atLimit ? "bg-red-500" : nearLimit ? "bg-orange-500" : quotaPct >= 50 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center justify-between mt-8 shadow">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">CSC Portal</div>
            <div className="text-xs text-sidebar-foreground/60">{user?.fullName ?? user?.operatorCode ?? "Operator"}</div>
          </div>
        </div>
        <button onClick={logout} className="p-2 hover:bg-sidebar-accent rounded-lg">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Quota card */}
        <div className={cn(
          "rounded-xl border p-5",
          atLimit ? "bg-red-50 border-red-200" : nearLimit ? "bg-orange-50 border-orange-200" : "bg-card border-border",
        )}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-semibold text-sm text-foreground">Daily Filing Quota</span>
              <div className="text-xs text-muted-foreground mt-0.5">Resets midnight</div>
            </div>
            <div className="text-right">
              <span className={cn("text-2xl font-bold", atLimit ? "text-red-700" : nearLimit ? "text-orange-700" : "text-foreground")}>
                {today}
              </span>
              <span className="text-sm text-muted-foreground"> / {QUOTA_LIMIT}</span>
            </div>
          </div>

          <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
            <div className={cn("h-full rounded-full transition-all duration-700", quotaBarColor)} style={{ width: `${quotaPct}%` }} />
          </div>

          <div className="flex items-center justify-between text-xs">
            {atLimit ? (
              <div className="flex items-center gap-1.5 text-red-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Limit reached — contact admin to unblock
              </div>
            ) : nearLimit ? (
              <div className="text-orange-700 font-medium">⚠ Only {remaining} claims remaining today</div>
            ) : (
              <div className="text-muted-foreground">{remaining} claims remaining</div>
            )}
            {approvedToday > 0 && (
              <div className="text-green-700 font-medium">{approvedToday} approved today</div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Today", value: today, icon: Clock, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
            { label: "This Week", value: d?.weekCount ?? 0, icon: TrendingUp, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
            { label: "Total Filed", value: d?.totalCount ?? 0, icon: Activity, color: "text-foreground", bg: "bg-card border-border" },
            { label: "Fraud Flagged", value: d?.fraudFlaggedCount ?? 0, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50 border-red-200" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-3 text-center", s.bg)}>
              <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
              <div className={cn("text-xl font-bold", s.color)}>{isLoading ? "—" : s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Peer performance */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-50 rounded-xl border border-primary/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Your Performance</div>
              <div className="text-xs text-muted-foreground">District ranking this week</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">#4</div>
            <div className="text-xs text-muted-foreground">of 23 operators</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/csc/farmer-lookup"
            className={cn(
              "flex items-center gap-3 bg-primary text-white rounded-xl p-4 hover:bg-primary/90 transition-colors active:scale-[0.98]",
              atLimit ? "opacity-50 pointer-events-none" : "",
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Find Farmer</div>
              <div className="text-xs text-white/70">Search & file claim</div>
            </div>
          </Link>
          <Link href="/csc/my-claims" className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">My Claims</div>
              <div className="text-xs text-muted-foreground">View history</div>
            </div>
          </Link>
        </div>

        {/* Live activity feed */}
        {(d?.recentClaims ?? []).length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="w-4 h-4 text-primary" /> Activity Feed
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>
            <div className="divide-y divide-border">
              {(d?.recentClaims ?? []).map((c) => {
                const isFlagged = (c.fraudFlags ?? []).length > 0;
                const statusClass = STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground";
                return (
                  <div key={c.id} className={cn("flex items-center gap-3 px-4 py-3", isFlagged ? "bg-red-50/50" : "")}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-foreground">{c.claimNumber}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", statusClass)}>{c.status.replace(/_/g, " ")}</span>
                        {isFlagged && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">⚠ Flagged</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize truncate">
                        {c.declaredCrop} · {c.udlrn ?? c.damageType?.toLowerCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{timeAgo(c.filedAt)}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
