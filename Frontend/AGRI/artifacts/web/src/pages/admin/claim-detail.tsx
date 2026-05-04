import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { FraudScoreBadge, FraudScoreBar } from "@/components/fraud-score-badge";
import { StatusBadge } from "@/components/status-badge";
import { SatelliteReport } from "@/components/satellite-report";
import { Link } from "wouter";
import {
  ChevronLeft, AlertTriangle, CheckCircle2, Calendar, User, Map,
  FileText, Activity, XCircle, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ClaimDetail {
  id: string; claimNumber: string; udlrn: string; farmerId: string;
  farmerName: string; farmerMobile: string; declaredCrop: string;
  damageType: string; sowingDate: string; damageDate: string;
  claimAmountRequested: number; approvedAmount?: number;
  status: string; fraudScore?: number; fraudConfidence?: number;
  fraudFlags?: string[]; ndviSowing?: number; ndviClaim?: number;
  ndviLossPct?: number;
  landDetails?: {
    landOwnerName?: string; landAreaHa?: number; landUseType?: string;
    mutationDate?: string; centroidLat?: number; centroidLng?: number;
  };
  auditTrail?: Array<{
    id: string; stepName: string; actorId: string; actorType: string;
    decisionReason?: string; createdAt: string;
  }>;
  filedAt: string; decidedAt?: string;
}

function ActionModal({ title, onClose, onConfirm, isLoading, children }: {
  title: string; onClose: () => void; onConfirm: () => void; isLoading: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-border"><h3 className="font-semibold text-foreground">{title}</h3></div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="p-5 border-t border-border flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {isLoading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimDetail({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<null | "approve" | "reject" | "cce" | "fir">(null);
  const [reason, setReason] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["claim-detail", params.id],
    queryFn: () => apiFetch<{ data: ClaimDetail }>(`/v1/admin/claims/${params.id}`),
  });

  const { data: satelliteData } = useQuery({
    queryKey: ["satellite-report", params.id],
    queryFn: () => apiFetch<{ data: any }>(`/v1/evidence/${params.id}/satellite`),
    enabled: !!params.id,
  });

  const claim = data?.data;

  const mutateClaim = (action: string, body: object) =>
    apiFetch(`/v1/admin/claims/${params.id}/${action}`, { method: "POST", body: JSON.stringify(body) });

  const approveMut = useMutation({
    mutationFn: () => mutateClaim("approve", { reason, approvedAmount: approvedAmount ? Number(approvedAmount) : undefined, confirmPassword }),
    onSuccess: () => { toast({ title: "Claim approved" }); qc.invalidateQueries({ queryKey: ["claim-detail", params.id] }); setModal(null); setConfirmPassword(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: () => mutateClaim("reject", { reason, confirmPassword }),
    onSuccess: () => { toast({ title: "Claim rejected" }); qc.invalidateQueries({ queryKey: ["claim-detail", params.id] }); setModal(null); setConfirmPassword(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cceMut = useMutation({
    mutationFn: () => mutateClaim("schedule-cce", { inspectorId, notes: reason }),
    onSuccess: () => { toast({ title: "CCE visit scheduled" }); qc.invalidateQueries({ queryKey: ["claim-detail", params.id] }); setModal(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const firMut = useMutation({
    mutationFn: () => mutateClaim("fir-alert", { reason }),
    onSuccess: () => { toast({ title: "FIR alert sent to District Collector" }); setModal(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-6"><div className="h-96 bg-muted rounded-xl animate-pulse" /></div>;
  if (error || !claim) return <div className="p-6"><div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">Claim not found</div></div>;

  const canAct = ["OFFICER_REVIEW", "CCE_VISIT", "APPEALED"].includes(claim.status);

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/review-queue" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-mono">{claim.claimNumber}</h1>
              <StatusBadge status={claim.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Filed {new Date(claim.filedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {canAct && (
          <div className="flex items-center gap-2">
            <button onClick={() => setModal("approve")} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
            <button onClick={() => setModal("cce")} className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600">
              <Calendar className="w-4 h-4" /> CCE Visit
            </button>
            <button onClick={() => setModal("reject")} className="flex items-center gap-1.5 px-3 py-2 bg-destructive text-white text-sm font-medium rounded-lg hover:bg-destructive/90">
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button onClick={() => setModal("fir")} className="flex items-center gap-1.5 px-3 py-2 border border-destructive text-destructive text-sm font-medium rounded-lg hover:bg-destructive/5">
              <AlertTriangle className="w-4 h-4" /> FIR Alert
            </button>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="w-4 h-4" /> Farmer Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{claim.farmerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-mono">{claim.farmerMobile}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">UDLRN</span>
                <Link href={`/admin/udlrn-search?udlrn=${claim.udlrn}`} className="font-mono text-xs text-primary hover:underline">
                  {claim.udlrn}
                </Link>
              </div>
            </div>
          </div>

          {claim.landDetails && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Map className="w-4 h-4" /> Land Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-medium">{claim.landDetails.landOwnerName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Area</span><span>{claim.landDetails.landAreaHa} Ha</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Land Use</span><span className="capitalize">{claim.landDetails.landUseType}</span></div>
                {claim.landDetails.mutationDate && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Mutation</span><span>{new Date(claim.landDetails.mutationDate).toLocaleDateString("en-IN")}</span></div>
                )}
                {claim.landDetails.centroidLat && (
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Coords</span><span className="font-mono">{Number(claim.landDetails.centroidLat).toFixed(4)}, {Number(claim.landDetails.centroidLng).toFixed(4)}</span></div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Claim Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Crop</span><span className="capitalize font-medium">{claim.declaredCrop}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Damage</span><span>{claim.damageType?.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sowing</span><span>{claim.sowingDate ? new Date(claim.sowingDate).toLocaleDateString("en-IN") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Damage Date</span><span>{claim.damageDate ? new Date(claim.damageDate).toLocaleDateString("en-IN") : "—"}</span></div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground">Claimed</span>
                <span className="font-semibold">₹{Number(claim.claimAmountRequested).toLocaleString("en-IN")}</span>
              </div>
              {claim.approvedAmount && (
                <div className="flex justify-between text-green-700">
                  <span>Approved</span>
                  <span className="font-bold">₹{Number(claim.approvedAmount).toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Fraud Analysis</h2>
              <FraudScoreBadge score={claim.fraudScore} size="md" />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Score</div>
              <FraudScoreBar score={claim.fraudScore} />
            </div>
            {claim.fraudConfidence != null && (
              <div className="text-xs text-muted-foreground">
                Confidence: <span className="font-semibold text-foreground">{(Number(claim.fraudConfidence) * 100).toFixed(0)}%</span>
              </div>
            )}
            {(claim.fraudFlags ?? []).length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Flags</div>
                {(claim.fraudFlags ?? []).map((flag) => (
                  <div key={flag} className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {flag.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            )}
          </div>

          {claim.ndviSowing != null && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">NDVI Analysis</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "At Sowing", value: Number(claim.ndviSowing).toFixed(3), color: "text-green-700" },
                  { label: "At Claim", value: Number(claim.ndviClaim).toFixed(3), color: "text-orange-700" },
                  { label: "Loss %", value: `${Number(claim.ndviLossPct).toFixed(1)}%`, color: "text-red-700" },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <div className={cn("text-lg font-bold", item.color)}>{item.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Satellite Report */}
          {satelliteData?.data && (
            <SatelliteReport data={satelliteData.data} isAdmin={true} compact={false} />
          )}
        </div>

        {/* Right: Audit trail */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4"><Activity className="w-4 h-4" /> Audit Trail</h2>
          <div className="space-y-3">
            {(claim.auditTrail ?? []).map((entry, i) => (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {i < (claim.auditTrail?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-3 flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{entry.stepName.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{entry.actorType} · {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  {entry.decisionReason && <div className="text-xs text-muted-foreground mt-0.5 truncate">{entry.decisionReason}</div>}
                </div>
              </div>
            ))}
            {(!claim.auditTrail || claim.auditTrail.length === 0) && (
              <div className="text-xs text-muted-foreground">No audit entries yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "approve" && (
        <ActionModal title="Approve Claim" onClose={() => setModal(null)} onConfirm={() => approveMut.mutate()} isLoading={approveMut.isPending}>
          <div>
            <label className="block text-sm font-medium mb-1">Approved Amount (₹)</label>
            <input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)}
              placeholder={`Default: ₹${Number(claim.claimAmountRequested).toLocaleString("en-IN")}`}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required
              placeholder="Reason for approval..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              placeholder="Enter your password to confirm"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
          </div>
        </ActionModal>
      )}
      {modal === "reject" && (
        <ActionModal title="Reject Claim" onClose={() => setModal(null)} onConfirm={() => rejectMut.mutate()} isLoading={rejectMut.isPending}>
          <div>
            <label className="block text-sm font-medium mb-1">Rejection Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required
              placeholder="Detailed reason for rejection..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              placeholder="Enter your password to confirm"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
          </div>
        </ActionModal>
      )}
      {modal === "cce" && (
        <ActionModal title="Schedule CCE Visit" onClose={() => setModal(null)} onConfirm={() => cceMut.mutate()} isLoading={cceMut.isPending}>
          <div>
            <label className="block text-sm font-medium mb-1">Inspector ID *</label>
            <input type="text" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} required
              placeholder="Officer email or ID..." className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Instructions for inspector..." className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
          </div>
        </ActionModal>
      )}
      {modal === "fir" && (
        <ActionModal title="Send FIR Alert to DC" onClose={() => setModal(null)} onConfirm={() => firMut.mutate()} isLoading={firMut.isPending}>
          <p className="text-sm text-muted-foreground">This will send a formal fraud report to the District Collector. Use only for confirmed fraudulent claims.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required
              placeholder="Evidence and justification for FIR..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
          </div>
        </ActionModal>
      )}
    </div>
  );
}
