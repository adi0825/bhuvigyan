import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { FraudScoreBadge } from "@/components/fraud-score-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Shield, BadgeDollarSign,
  FileCheck, Users
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalClaimsToday: number;
  autoApprovedToday: number;
  underReviewToday: number;
  fraudRejectedToday: number;
  amountSavedToday: number;
  totalClaimsAllTime: number;
  pendingReview: number;
  pendingCce: number;
  recentClaims: Array<{
    id: string; claimNumber: string; udlrn: string; declaredCrop: string;
    damageType: string; fraudScore: number; status: string; filedAt: string;
  }>;
  verdictBreakdown: {
    autoApproved: number; officerReview: number; cceVisit: number; autoRejected: number;
  };
}

const COLORS = ["#16a34a", "#d97706", "#ea580c", "#dc2626"];

function StatCard({ title, value, icon: Icon, color, subtitle }: {
  title: string; value: string | number; icon: React.ElementType; color: string; subtitle?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm font-medium text-foreground mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch<{ data: DashboardStats }>("/v1/admin/dashboard"),
    refetchInterval: 30000,
  });

  const stats = data?.data;

  const verdictData = stats?.verdictBreakdown ? [
    { name: "Auto Approved", value: stats.verdictBreakdown.autoApproved, color: COLORS[0] },
    { name: "Officer Review", value: stats.verdictBreakdown.officerReview, color: COLORS[1] },
    { name: "CCE Visit", value: stats.verdictBreakdown.cceVisit, color: COLORS[2] },
    { name: "Fraud Rejected", value: stats.verdictBreakdown.autoRejected, color: COLORS[3] },
  ] : [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">
          Failed to load dashboard: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {(stats?.pendingReview ?? 0) > 0 && (
          <Link
            href="/admin/review-queue"
            className="flex items-center gap-2 bg-destructive text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {stats?.pendingReview} Pending Review
          </Link>
        )}
      </div>

      {/* Today's KPIs */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Activity</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Claims" value={stats?.totalClaimsToday ?? 0} icon={FileCheck} color="bg-primary" subtitle="Filed today" />
          <StatCard title="Auto-Approved" value={stats?.autoApprovedToday ?? 0} icon={CheckCircle2} color="bg-green-600" subtitle="Score ≤ 30" />
          <StatCard title="Under Review" value={stats?.underReviewToday ?? 0} icon={Clock} color="bg-yellow-500" subtitle="Awaiting officer" />
          <StatCard title="Fraud Rejected" value={stats?.fraudRejectedToday ?? 0} icon={AlertTriangle} color="bg-red-600" subtitle={`₹${((stats?.amountSavedToday ?? 0) / 1000).toFixed(0)}K saved`} />
        </div>
      </div>

      {/* All-time + Pending */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="All-Time Claims" value={(stats?.totalClaimsAllTime ?? 0).toLocaleString("en-IN")} icon={TrendingUp} color="bg-blue-600" />
        <StatCard title="Pending Review" value={stats?.pendingReview ?? 0} icon={Clock} color="bg-orange-500" />
        <StatCard title="CCE Visits Pending" value={stats?.pendingCce ?? 0} icon={Users} color="bg-purple-600" />
        <StatCard title="Amount Saved Today" value={`₹${((stats?.amountSavedToday ?? 0) / 100000).toFixed(2)}L`} icon={BadgeDollarSign} color="bg-emerald-600" subtitle="Fraud prevented" />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Today's Verdict Breakdown</h2>
          {verdictData.every((d) => d.value === 0) ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No claims today</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={verdictData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {verdictData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, ""]} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent claims */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Claims</h2>
            <Link href="/admin/review-queue" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {(stats?.recentClaims ?? []).slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/admin/claims/${c.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-foreground">{c.claimNumber}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.declaredCrop} · {c.damageType} · {c.udlrn}
                  </div>
                </div>
                <FraudScoreBadge score={c.fraudScore} size="sm" />
              </Link>
            ))}
            {(!stats?.recentClaims || stats.recentClaims.length === 0) && (
              <div className="text-sm text-muted-foreground text-center py-6">No claims yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
