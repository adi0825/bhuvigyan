import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DevBanner } from "@/components/dev-banner";
import { apiFetch } from "@/lib/api";

interface RuleProfile {
  id: string;
  stateCode: string | null;
  seasonType: string | null;
  profileName: string;
  autoApproveThreshold: number;
  officerReviewThreshold: number;
  cceVisitThreshold: number;
  autoRejectThreshold: number;
  mutationDaysAlert: number;
  cscDailyBulkLimit: number;
  bankNameMatchMinScore: number;
  areaDeltaMaxPct: string;
  overInsuranceMaxRatio: string;
  minBaselineNdvi: string;
  isActive: boolean;
  updatedAt: string;
}

const STATE_NAMES: Record<string, string> = {
  "29": "Karnataka", "27": "Maharashtra", "36": "Telangana",
  "08": "Rajasthan", "03": "Punjab", "09": "Uttar Pradesh",
};

export default function AdminRules() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<RuleProfile | null>(null);
  const [form, setForm] = useState<Partial<RuleProfile>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rules"],
    queryFn: () => apiFetch<{ data: RuleProfile[] }>("/v1/admin/rules"),
  });

  const updateMutation = useMutation({
    mutationFn: (profile: Partial<RuleProfile> & { id: string }) =>
      apiFetch(`/v1/admin/rules/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify(profile),
      }),
    onSuccess: () => {
      toast({ title: "Rule profile updated", description: "Thresholds saved and active" });
      qc.invalidateQueries({ queryKey: ["admin-rules"] });
      setEditing(null);
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const profiles: RuleProfile[] = data?.data ?? [];

  function openEdit(p: RuleProfile) {
    setEditing(p);
    setForm({ ...p });
  }

  function Field({ label, field, type = "number", min, max }: { label: string; field: keyof RuleProfile; type?: string; min?: number; max?: number }) {
    return (
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
        <input
          type={type}
          min={min} max={max}
          value={form[field] as string | number ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
          className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DevBanner />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rule Management</h1>
          <p className="text-gray-500 text-sm mt-1">Configure fraud detection thresholds per state and season. Changes take effect immediately.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading rule profiles…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {profiles.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.profileName}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {p.stateCode && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {STATE_NAMES[p.stateCode] ?? p.stateCode}
                        </span>
                      )}
                      {p.seasonType && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{p.seasonType}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Auto Approve</div>
                    <div className="font-bold text-green-700">≤ {p.autoApproveThreshold}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Officer Review</div>
                    <div className="font-bold text-yellow-700">≤ {p.officerReviewThreshold}</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">CCE Visit</div>
                    <div className="font-bold text-orange-700">≤ {p.cceVisitThreshold}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Auto Reject</div>
                    <div className="font-bold text-red-700">≥ {p.autoRejectThreshold}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div><span className="font-medium">Mutation alert:</span> {p.mutationDaysAlert}d</div>
                  <div><span className="font-medium">CSC daily limit:</span> {p.cscDailyBulkLimit}</div>
                  <div><span className="font-medium">Bank match min:</span> {p.bankNameMatchMinScore}%</div>
                  <div><span className="font-medium">Area delta max:</span> {p.areaDeltaMaxPct}%</div>
                  <div><span className="font-medium">Over-ins ratio:</span> {p.overInsuranceMaxRatio}×</div>
                  <div><span className="font-medium">Min NDVI baseline:</span> {p.minBaselineNdvi}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold">Edit: {editing.profileName}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editing.stateCode ? STATE_NAMES[editing.stateCode] : "All States"} • V6 Rule Pack
                </p>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score Thresholds</div>
                <Field label="Auto Approve (0–100)" field="autoApproveThreshold" min={0} max={100} />
                <Field label="Officer Review Max" field="officerReviewThreshold" min={0} max={100} />
                <Field label="CCE Visit Max" field="cceVisitThreshold" min={0} max={100} />
                <Field label="Auto Reject Min" field="autoRejectThreshold" min={0} max={100} />
                <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Fraud Rule Parameters</div>
                <Field label="Mutation Days Alert" field="mutationDaysAlert" min={1} max={365} />
                <Field label="CSC Daily Bulk Limit" field="cscDailyBulkLimit" min={1} max={100} />
                <Field label="Bank Name Match Min (%)" field="bankNameMatchMinScore" min={0} max={100} />
                <Field label="Area Delta Max (%)" field="areaDeltaMaxPct" type="text" />
                <Field label="Over-Insurance Max Ratio" field="overInsuranceMaxRatio" type="text" />
                <Field label="Min Baseline NDVI" field="minBaselineNdvi" type="text" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => form.id && updateMutation.mutate(form as any)}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
