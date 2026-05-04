import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Shield, Lock, Unlock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CscOperator {
  id: string; operatorCode: string; fullName: string; districtId?: string; stateCode?: string;
  isBlocked: boolean; blockedReason?: string; todayClaimsCount: number;
  totalClaims: number; fraudRate?: number; createdAt: string;
}

const QUOTA_LIMIT = 50;

export default function CscOperators() {
  const [blockModal, setBlockModal] = useState<{ id: string; name: string; action: "block" | "unblock" } | null>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["csc-operators"],
    queryFn: () => apiFetch<{ data: CscOperator[] }>("/v1/admin/csc-operators"),
    refetchInterval: 30000,
  });

  const blockMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/v1/admin/csc-operators/${id}/${action}`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      toast({ title: `CSC operator ${vars.action === "block" ? "blocked" : "unblocked"}` });
      qc.invalidateQueries({ queryKey: ["csc-operators"] });
      setBlockModal(null);
      setReason("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const operators = data?.data ?? [];
  const blocked = operators.filter((o) => o.isBlocked).length;
  const nearQuota = operators.filter((o) => !o.isBlocked && o.todayClaimsCount >= 45).length;
  const highFraudOps = operators.filter((o) => o.fraudRate != null && Number(o.fraudRate) > 15);

  return (
    <div className="p-6 space-y-5">
      {/* High Fraud Rate Warning Banner */}
      {highFraudOps.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">High Fraud Rate Alert</div>
            <div className="text-sm text-red-700 mt-1">
              {highFraudOps.length} CSC operator{highFraudOps.length > 1 ? "s have" : " has"} fraud rate above 15%:{" "}
              {highFraudOps.slice(0, 3).map((o) => o.fullName).join(", ")}
              {highFraudOps.length > 3 && ` and ${highFraudOps.length - 3} more`}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CSC Operators</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Common Service Centre fraud monitoring</p>
        </div>
        <div className="flex gap-3 text-sm">
          {blocked > 0 && <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium">{blocked} Blocked</div>}
          {nearQuota > 0 && <div className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-medium">{nearQuota} Near Quota</div>}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Operator", "State/District", "Today's Quota", "Total Claims", "Fraud Rate", "Status", "Action"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
            ))}
            {operators.map((op) => {
              const quotaPct = Math.min(100, (op.todayClaimsCount / QUOTA_LIMIT) * 100);
              const quotaColor = quotaPct >= 100 ? "bg-red-500" : quotaPct >= 90 ? "bg-orange-500" : quotaPct >= 70 ? "bg-yellow-500" : "bg-green-500";
              return (
                <tr key={op.id} className={cn("hover:bg-muted/30 transition-colors", op.isBlocked && "bg-red-50/50")}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{op.fullName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{op.operatorCode}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {op.stateCode && <div>State: {op.stateCode}</div>}
                    {op.districtId && <div>District: {op.districtId}</div>}
                    {!op.stateCode && <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", quotaColor)} style={{ width: `${quotaPct}%` }} />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">{op.todayClaimsCount}/{QUOTA_LIMIT}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{op.totalClaims}</td>
                  <td className="px-4 py-3">
                    {op.fraudRate != null ? (
                      <span className={cn("text-xs font-semibold", Number(op.fraudRate) > 30 ? "text-red-600" : Number(op.fraudRate) > 15 ? "text-orange-600" : "text-green-600")}>
                        {Number(op.fraudRate).toFixed(1)}%
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {op.isBlocked ? (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        <Lock className="w-3 h-3" /> Blocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        <Shield className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setBlockModal({ id: op.id, name: op.fullName, action: op.isBlocked ? "unblock" : "block" })}
                      className={cn("flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                        op.isBlocked
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100",
                      )}
                    >
                      {op.isBlocked ? <><Unlock className="w-3 h-3" /> Unblock</> : <><Lock className="w-3 h-3" /> Block</>}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && operators.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No CSC operators found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {blockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-foreground">
                {blockModal.action === "block" ? "Block" : "Unblock"} CSC Operator
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {blockModal.action === "block"
                ? `This will prevent ${blockModal.name} from filing any new claims.`
                : `This will allow ${blockModal.name} to resume filing claims.`}
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Reason *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder={blockModal.action === "block" ? "Reason for blocking..." : "Reason for unblocking..."}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setBlockModal(null); setReason(""); }} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button
                onClick={() => blockMut.mutate({ id: blockModal.id, action: blockModal.action })}
                disabled={!reason || blockMut.isPending}
                className={cn("flex-1 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors",
                  blockModal.action === "block" ? "bg-destructive text-white hover:bg-destructive/90" : "bg-green-600 text-white hover:bg-green-700")}
              >
                {blockMut.isPending ? "Processing..." : blockModal.action === "block" ? "Block Operator" : "Unblock Operator"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
