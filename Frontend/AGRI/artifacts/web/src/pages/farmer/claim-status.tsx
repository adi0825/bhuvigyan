import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { SatelliteReport } from "@/components/satellite-report";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Send, CheckCircle2, Loader2, AlertTriangle, Zap, Shield,
  Database, Satellite, BarChart2, Brain, Award, Clock, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";
import { cn } from "@/lib/utils";

interface ClaimStatus {
  id: string; claimNumber: string; status: string; pipelineStage?: string;
  declaredCrop: string; damageType: string; filedAt: string;
  decidedAt?: string; approvedAmount?: number; rejectionReason?: string;
  dbtStatus?: string; fraudScore?: number;
}

const PIPELINE_STAGES = [
  { key: "INGESTION", label: "Filed", icon: Database, short: "Filed" },
  { key: "LAND_VERIFICATION", label: "Land Check", icon: Shield, short: "Land" },
  { key: "SATELLITE_ANALYSIS", label: "Satellite", icon: Satellite, short: "Sat" },
  { key: "FEATURE_ENGINEERING", label: "Analysis", icon: BarChart2, short: "Analyze" },
  { key: "FRAUD_SCORING", label: "AI Fraud Scan", icon: Brain, short: "AI Scan" },
  { key: "VERDICT", label: "Verdict", icon: Award, short: "Verdict" },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle2, short: "Done" },
];

function FraudRing({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score <= 30 ? "#22c55e" : score <= 60 ? "#f59e0b" : score <= 80 ? "#f97316" : "#ef4444";
  const label = score <= 30 ? "Low Risk" : score <= 60 ? "Medium Risk" : score <= 80 ? "High Risk" : "Critical";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 shadow-inner"
        style={{ borderColor: color, backgroundColor: `${color}18` }}
      >
        <span className="text-xl font-black" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground leading-none">/ 100</span>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function FarmerClaimStatus({ params: propParams }: { params?: { id?: string } }) {
  const [, navigate] = useLocation();
  const routeParams = useParams<{ id: string }>();
  const claimId = propParams?.id ?? routeParams?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [appealText, setAppealText] = useState("");
  const [showAppeal, setShowAppeal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["claim-status", claimId],
    queryFn: () => apiFetch<{ data: ClaimStatus }>(`/v1/claims/status/${claimId}`),
    enabled: !!claimId,
    refetchInterval: 10000,
  });

  const { data: satelliteData } = useQuery({
    queryKey: ["satellite-report", claimId],
    queryFn: () => apiFetch<{ data: any }>(`/v1/evidence/${claimId}/satellite`),
    enabled: !!claimId && ["AUTO_APPROVED", "AUTO_REJECTED", "OFFICER_REVIEW", "CCE_VISIT", "COMPLETED"].includes(data?.data?.status ?? ""),
  });

  const appealMut = useMutation({
    mutationFn: () => apiFetch(`/v1/claims/appeal/${claimId}`, { method: "POST", body: JSON.stringify({ appealText }) }),
    onSuccess: () => {
      toast({ title: "Appeal submitted successfully" });
      qc.invalidateQueries({ queryKey: ["claim-status", claimId] });
      setShowAppeal(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const claim = data?.data;
  const currentStageIdx = claim?.pipelineStage ? PIPELINE_STAGES.findIndex((s) => s.key === claim.pipelineStage) : -1;
  const isProcessing = claim?.pipelineStage
    && !["COMPLETED", "PIPELINE_ERROR"].includes(claim.pipelineStage)
    && !["APPROVED", "AUTO_APPROVED", "REJECTED", "AUTO_REJECTED", "REJECTED_FRAUD", "APPEALED"].includes(claim.status ?? "");

  const isApproved = ["APPROVED", "AUTO_APPROVED"].includes(claim?.status ?? "");
  const isRejected = ["REJECTED", "AUTO_REJECTED", "REJECTED_FRAUD"].includes(claim?.status ?? "");

  return (
    <div className="min-h-screen bg-background pb-24 pt-8">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 sticky top-8 z-10 shadow">
        <button onClick={() => navigate("/farmer/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <span className="font-semibold">Claim Status</span>
          {claim && <span className="ml-2 text-xs text-sidebar-foreground/60 font-mono">{claim.claimNumber}</span>}
        </div>
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-sidebar-foreground/70" />}
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
        )}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
            {(error as Error).message?.includes("401") || (error as Error).message?.includes("Authentication")
              ? "Session expired — please log in again."
              : (error as Error).message?.includes("404") || (error as Error).message?.includes("not found")
              ? "Claim not found or access denied."
              : (error as Error).message ?? "Unable to load claim."}
          </div>
        )}

        {claim && (
          <>
            {/* Header card */}
            <div className={cn(
              "rounded-xl border p-4 transition-all",
              isApproved ? "bg-green-50 border-green-300 shadow-green-100 shadow-md" :
              isRejected ? "bg-red-50 border-red-300 shadow-red-100 shadow-md" :
              "bg-card border-border",
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-mono font-bold text-foreground text-xl tracking-wider">{claim.claimNumber}</div>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={claim.status} />
                    {isApproved && <span className="text-xs text-green-700 font-medium animate-pulse">✓ Payment being processed</span>}
                    {isProcessing && <span className="text-xs text-primary font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI Pipeline active</span>}
                  </div>
                </div>
                <FraudRing score={claim.fraudScore ?? undefined} />
              </div>
            </div>

            {/* AI Pipeline progress */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" /> V6 Processing Pipeline
              </div>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="flex items-start gap-0 min-w-max">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const done = currentStageIdx > i || (!isProcessing && currentStageIdx >= 0 && i <= currentStageIdx);
                    const active = i === currentStageIdx && isProcessing;
                    const Icon = stage.icon;
                    const isLast = i === PIPELINE_STAGES.length - 1;

                    return (
                      <div key={stage.key} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5 w-14">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                            done ? "bg-primary text-white shadow-md" :
                            active ? "bg-primary/10 text-primary ring-2 ring-primary ring-offset-1 animate-pulse" :
                            "bg-muted text-muted-foreground",
                          )}>
                            {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                          </div>
                          <span className={cn(
                            "text-[9px] font-medium text-center leading-tight",
                            done ? "text-primary" : active ? "text-foreground font-semibold" : "text-muted-foreground",
                          )}>
                            {stage.short}
                          </span>
                          {active && (
                            <span className="text-[8px] text-primary animate-pulse font-bold">LIVE</span>
                          )}
                        </div>
                        {!isLast && (
                          <div className={cn("h-0.5 w-4 flex-shrink-0 mb-6", done ? "bg-primary" : "bg-muted")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {isProcessing && (
                <div className="mt-3 text-xs text-center text-muted-foreground bg-primary/5 rounded-lg py-2">
                  Auto-refreshing every 10 seconds · <span className="text-primary font-medium">{PIPELINE_STAGES[currentStageIdx]?.label ?? "Processing"}</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Claim Details
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Crop</span><span className="capitalize font-medium">{claim.declaredCrop}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Damage</span><span>{claim.damageType?.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Filed</span><span>{new Date(claim.filedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                {claim.decidedAt && <div className="flex justify-between"><span className="text-muted-foreground">Decided</span><span>{new Date(claim.decidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>}
              </div>
            </div>

            {/* Satellite Report */}
            {satelliteData?.data && (
              <SatelliteReport data={satelliteData.data} isAdmin={false} compact={true} />
            )}

            {/* Approved */}
            {isApproved && claim.approvedAmount && (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 text-center space-y-2 shadow-md">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <div className="text-sm font-semibold text-green-800">Claim Approved!</div>
                <div className="text-3xl font-black text-green-700">₹{Number(claim.approvedAmount).toLocaleString("en-IN")}</div>
                <div className="text-xs text-green-600 bg-green-100 rounded-lg px-3 py-1.5 inline-block">
                  DBT Status: <span className="font-bold uppercase">{claim.dbtStatus ?? "Pending"}</span>
                </div>
                <div className="text-xs text-green-600">Credited to your registered bank account within 3 working days</div>
              </div>
            )}

            {/* Rejected */}
            {isRejected && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div className="text-sm font-semibold text-red-800">Claim Rejected</div>
                </div>
                {claim.rejectionReason && <div className="text-sm text-red-700 bg-red-100 rounded-lg px-3 py-2">{claim.rejectionReason}</div>}
                {claim.status !== "APPEALED" && (
                  <button
                    onClick={() => setShowAppeal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Send className="w-4 h-4" /> Appeal this Decision
                  </button>
                )}
              </div>
            )}

            {/* Appeal form */}
            {showAppeal && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="text-sm font-semibold text-foreground">Submit Appeal</div>
                <textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  rows={4}
                  placeholder="Explain why you believe this claim should be reconsidered. Include any supporting evidence or documentation..."
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowAppeal(false)} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
                  <button
                    onClick={() => appealMut.mutate()}
                    disabled={appealMut.isPending || !appealText.trim()}
                    className="flex-1 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {appealMut.isPending ? "Submitting..." : "Submit Appeal"}
                  </button>
                </div>
              </div>
            )}

            {/* Download Evidence PDF */}
            {claim && ["COMPLETED", "APPROVED", "AUTO_APPROVED", "REJECTED", "AUTO_REJECTED"].includes(claim.status) && (
              <button
                onClick={() => {
                  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
                  window.open(`${base}/api/v1/evidence/${claimId}/pdf`, "_blank");
                }}
                className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Evidence PDF
              </button>
            )}
          </>
        )}
      </div>
      <FarmerBottomNav />
    </div>
  );
}
