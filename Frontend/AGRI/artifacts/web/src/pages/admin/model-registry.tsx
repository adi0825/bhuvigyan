import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DevBanner } from "@/components/dev-banner";
import { apiFetch } from "@/lib/api";

interface ModelEntry {
  id: string;
  modelName: string;
  modelType: string;
  version: string;
  description: string;
  featureCount: number;
  isActive: boolean;
  isProduction: boolean;
  deployedAt: string | null;
  metrics: Record<string, number>;
  totalClaimsScored: number;
  driftAlert: boolean;
  driftMetrics: Record<string, unknown>;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  ENSEMBLE: "bg-purple-100 text-purple-700",
  CROP_CLASSIFIER: "bg-blue-100 text-blue-700",
  ANOMALY_DETECTOR: "bg-orange-100 text-orange-700",
  TIMELINE_VALIDATOR: "bg-teal-100 text-teal-700",
};

export default function ModelRegistry() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["model-registry"],
    queryFn: () => apiFetch<{ data: ModelEntry[] }>("/v1/admin/model-registry"),
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/v1/admin/model-registry/${id}/promote`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Model promoted to production" });
      qc.invalidateQueries({ queryKey: ["model-registry"] });
    },
    onError: () => toast({ title: "Promotion failed", variant: "destructive" }),
  });

  const models: ModelEntry[] = data?.data ?? [];

  function MetricBar({ label, value }: { label: string; value: number }) {
    const pct = Math.round(value * 100);
    const color = pct >= 90 ? "bg-green-500" : pct >= 80 ? "bg-yellow-500" : "bg-red-500";
    return (
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-0.5">
          <span>{label}</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DevBanner />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Model Registry</h1>
          <p className="text-gray-500 text-sm mt-1">
            V6 ensemble models — 3-model weighted scoring (Crop Classifier × 0.35, Anomaly Detector × 0.40, Timeline Validator × 0.25)
          </p>
        </div>

        {/* Production model highlight */}
        {models.filter((m) => m.isProduction).map((m) => (
          <div key={m.id} className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 mb-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">PRODUCTION</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">47 FEATURES</span>
            </div>
            <h2 className="text-xl font-bold">{m.modelName}</h2>
            <p className="text-purple-200 text-sm mt-0.5">{m.description}</p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {["precision", "recall", "f1", "auc_roc"].map((k) => (
                <div key={k} className="bg-white/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{((m.metrics[k] ?? 0) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-purple-200 uppercase">{k.replace("_", " ")}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-purple-300">
              {m.totalClaimsScored.toLocaleString("en-IN")} claims scored · Deployed {m.deployedAt ? new Date(m.deployedAt).toLocaleDateString("en-IN") : "N/A"}
              {m.driftAlert && <span className="ml-3 bg-red-500 text-white px-2 py-0.5 rounded-full">⚠️ Drift Alert</span>}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading model registry…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.filter((m) => !m.isProduction).map((m) => (
              <div key={m.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.modelType] ?? "bg-gray-100 text-gray-700"}`}>
                        {m.modelType.replace("_", " ")}
                      </span>
                      {m.driftAlert && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠️ Drift</span>}
                      {m.isActive && !m.isProduction && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Candidate</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">{m.modelName}</h3>
                    <span className="text-xs text-gray-400">{m.version}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{m.description}</p>

                <div className="space-y-2 mb-4">
                  {["precision", "recall", "f1"].map((k) => (
                    m.metrics[k] !== undefined && (
                      <MetricBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={m.metrics[k]} />
                    )
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
                  <span>{m.featureCount} features</span>
                  <span>{m.totalClaimsScored.toLocaleString("en-IN")} scored</span>
                </div>

                <button
                  onClick={() => promoteMutation.mutate(m.id)}
                  disabled={promoteMutation.isPending}
                  className="mt-3 w-full text-sm bg-purple-600 text-white py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {promoteMutation.isPending ? "Promoting…" : "Promote to Production"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
