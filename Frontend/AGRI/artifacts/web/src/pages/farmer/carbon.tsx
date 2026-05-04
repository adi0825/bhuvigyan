import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { ArrowLeft, Leaf, TrendingUp, Award, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";

const PRACTICES = [
  { id: "DSR", name: "Direct Seeded Rice", emoji: "🌾", desc: "Reduce water usage by 30% and methane emissions", estimatePerHa: 2.1 },
  { id: "NO_TILLAGE", name: "Zero Tillage", emoji: "🌱", desc: "Reduce soil disturbance to preserve organic carbon", estimatePerHa: 1.8 },
  { id: "CROP_RESIDUE", name: "Crop Residue Retention", emoji: "🍂", desc: "Return crop residue to soil instead of burning", estimatePerHa: 1.5 },
  { id: "AGROFORESTRY", name: "Agroforestry", emoji: "🌳", desc: "Integrate trees with crops for additional sequestration", estimatePerHa: 3.2 },
  { id: "ORGANIC_FARMING", name: "Organic Farming", emoji: "🌿", desc: "Switch to organic inputs to boost soil carbon", estimatePerHa: 2.4 },
];

interface CarbonStatus {
  eligible: boolean; enrolled: boolean; practiceType?: string;
  carbonScore?: number; landAreaHa?: number; creditsEarned?: number;
  project?: { id: string; status: string; baselineNdvi?: number; createdAt: string };
}

export default function FarmerCarbon() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPractice, setSelectedPractice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-carbon"],
    queryFn: () => apiFetch<{ data: CarbonStatus }>("/v1/farmer/carbon"),
  });

  const enrolMut = useMutation({
    mutationFn: () => apiFetch("/v1/farmer/carbon/enrol", { method: "POST", body: JSON.stringify({ practiceType: selectedPractice }) }),
    onSuccess: () => {
      toast({ title: "Enrolled in carbon programme", description: "Your land will be monitored monthly for NDVI changes" });
      qc.invalidateQueries({ queryKey: ["farmer-carbon"] });
    },
    onError: (e: Error) => toast({ title: "Enrolment failed", description: e.message, variant: "destructive" }),
  });

  const status = data?.data;

  return (
    <div className="min-h-screen bg-background pb-20 pt-8">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 sticky top-8 z-10">
        <button onClick={() => navigate("/farmer/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">Carbon Credits</span>
      </header>

      {isLoading && (
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      {status && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {/* Not eligible */}
          {!status.eligible && (
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <Leaf className="w-12 h-12 text-muted mx-auto mb-3" />
              <h2 className="font-semibold text-foreground mb-2">Not Eligible Yet</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Carbon credit eligibility requires: agricultural land, area ≥ 0.5 Ha, and baseline NDVI &gt; 0.2 (established crop growth history).
              </p>
              <div className="mt-4 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                Your carbon score: <span className="font-bold text-foreground">{status.carbonScore ?? "—"}</span> / 100
              </div>
            </div>
          )}

          {/* Eligible but not enrolled */}
          {status.eligible && !status.enrolled && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-800">You're eligible!</div>
                    <div className="text-xs text-green-600">Enrol to start earning carbon credits</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <div className="font-bold text-green-700">{status.landAreaHa ?? "2.5"} Ha</div>
                    <div className="text-xs text-muted-foreground">Land Area</div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="font-bold text-green-700">{status.carbonScore ?? "72"}</div>
                    <div className="text-xs text-muted-foreground">Carbon Score</div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="font-bold text-green-700">75%</div>
                    <div className="text-xs text-muted-foreground">Your Share</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground mb-3">Choose your practice</div>
                <div className="space-y-2">
                  {PRACTICES.map((p) => {
                    const estimate = ((status.landAreaHa ?? 2.5) * p.estimatePerHa).toFixed(1);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPractice(p.id)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors",
                          selectedPractice === p.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30",
                        )}
                      >
                        <span className="text-2xl">{p.emoji}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-green-700">~{estimate} tCO₂</div>
                          <div className="text-xs text-muted-foreground">per year</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 flex gap-3">
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  After enrolment, your land is monitored monthly using Sentinel-2 satellite imagery. Carbon credits are issued after 12 months of verification. You receive 75% of the credit value.
                </p>
              </div>

              <button
                onClick={() => enrolMut.mutate()}
                disabled={!selectedPractice || enrolMut.isPending}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {enrolMut.isPending ? "Enrolling..." : "Enrol in Carbon Programme"}
              </button>
            </>
          )}

          {/* Enrolled */}
          {status.enrolled && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">Active Carbon Project</div>
                    <div className="text-xs text-green-600 capitalize">Practice: {status.practiceType?.replace(/_/g, " ").toLowerCase()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{status.creditsEarned ?? 0}</div>
                    <div className="text-xs text-muted-foreground">tCO₂ Credits Earned</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">₹{((status.creditsEarned ?? 0) * 1200 * 0.75).toLocaleString("en-IN")}</div>
                    <div className="text-xs text-muted-foreground">Est. Payout (75%)</div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Project Timeline</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Enrolment", status: "done", date: status.project?.createdAt ? new Date(status.project.createdAt).toLocaleDateString("en-IN") : "—" },
                    { label: "Baseline NDVI captured", status: "done", date: "Monthly monitoring started" },
                    { label: "6-month verification", status: "active", date: "In progress" },
                    { label: "Credit issuance (12 months)", status: "pending", date: "Pending" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        s.status === "done" ? "bg-green-600 text-white" : s.status === "active" ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground")}>
                        {s.status === "done" ? "✓" : i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Credit Status</h2>
                </div>
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {(status.creditsEarned ?? 0) === 0
                    ? "Credits will be issued after 12 months of monitoring. Keep practising sustainable farming!"
                    : `${status.creditsEarned} tCO₂ credits issued — status: VERIFIED`
                  }
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <FarmerBottomNav />
    </div>
  );
}
