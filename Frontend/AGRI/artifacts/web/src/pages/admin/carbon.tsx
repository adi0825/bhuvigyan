import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Leaf, TrendingUp, Award, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

interface CarbonIntelligence {
  totalEligibleFarmers: number; totalEnrolled: number; totalCreditsIssued: number; totalPayoutInr: number;
  districtPotential: Array<{ districtName: string; eligibleFarmers: number; potentialCredits: number }>;
  practiceBreakdown: Array<{ practice: string; count: number }>;
  monthlyCredits: Array<{ month: string; credits: number }>;
}

const PRACTICE_COLORS = ["#16a34a", "#0ea5e9", "#8b5cf6", "#d97706", "#ec4899"];

export default function AdminCarbon() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-carbon"],
    queryFn: () => apiFetch<{ data: CarbonIntelligence }>("/v1/admin/carbon"),
  });

  const d = data?.data;

  const stats = [
    { label: "Eligible Farmers", value: (d?.totalEligibleFarmers ?? 0).toLocaleString("en-IN"), icon: Users, color: "bg-green-600" },
    { label: "Enrolled", value: (d?.totalEnrolled ?? 0).toLocaleString("en-IN"), icon: Leaf, color: "bg-emerald-600" },
    { label: "Credits Issued (tCO₂)", value: (d?.totalCreditsIssued ?? 0).toFixed(1), icon: Award, color: "bg-blue-600" },
    { label: "Farmer Payouts", value: `₹${((d?.totalPayoutInr ?? 0) / 100000).toFixed(2)}L`, icon: TrendingUp, color: "bg-purple-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Carbon Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Carbon credit programme monitoring and analytics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{isLoading ? "—" : value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* District potential */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">District Carbon Potential</h2>
          {isLoading ? <div className="h-52 bg-muted rounded-lg animate-pulse" /> : (d?.districtPotential ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(d?.districtPotential ?? []).slice(0, 8)} layout="vertical" margin={{ left: 70, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="districtName" tick={{ fontSize: 11 }} width={65} />
                <Tooltip formatter={(v) => [`${v} tCO₂`, "Potential"]} />
                <Bar dataKey="potentialCredits" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No district data available</div>}
        </div>

        {/* Practice breakdown */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Practice Breakdown</h2>
          {isLoading ? <div className="h-52 bg-muted rounded-lg animate-pulse" /> : (d?.practiceBreakdown ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={d?.practiceBreakdown ?? []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="practice">
                  {(d?.practiceBreakdown ?? []).map((_, i) => <Cell key={i} fill={PRACTICE_COLORS[i % PRACTICE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [v, String(name).replace(/_/g, " ")]} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v.replace(/_/g, " ")}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No enrolled farmers yet</div>}
        </div>
      </div>

      {/* Monthly credits chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Credits Issued (tCO₂)</h2>
        {isLoading ? <div className="h-40 bg-muted rounded-lg animate-pulse" /> : (d?.monthlyCredits ?? []).length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={d?.monthlyCredits ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="credits" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            No credits issued yet. Carbon projects need 12 months to mature.
          </div>
        )}
      </div>
    </div>
  );
}
