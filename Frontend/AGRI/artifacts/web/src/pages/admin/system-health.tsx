import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DevBanner } from "@/components/dev-banner";
import { apiFetch } from "@/lib/api";

function StatusDot({ status }: { status: string }) {
  const ok = status === "UP" || status === "OK" || status === "SIMULATED";
  const fallback = status === "FALLBACK";
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${ok ? "bg-green-500" : fallback ? "bg-yellow-400" : "bg-red-500"}`} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "UP" || status === "OK" ? "bg-green-100 text-green-700"
    : status === "FALLBACK" || status === "SIMULATED" ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{status}</span>;
}

export default function SystemHealth() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: deps, isLoading: depsLoading } = useQuery({
    queryKey: ["system-dependencies"],
    queryFn: () => apiFetch<{ dependencies: Record<string, { status: string; type: string; note: string }>; pipeline: { outboxPendingJobs?: number; outboxDeadLetters?: number; activeModelVersion?: string; modelDriftAlert?: boolean }; stateAdapters: unknown[] }>("/system/dependencies"),
    refetchInterval: 15000,
  });

  const { data: mode } = useQuery({
    queryKey: ["system-mode"],
    queryFn: () => apiFetch<{ degraded?: boolean; degradedReason?: string; runMode?: string }>("/system/mode"),
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ["system-health"],
    queryFn: () => apiFetch<{ status: string; version?: string }>("/system/health"),
    refetchInterval: 5000,
  });

  const enableDegradedMutation = useMutation({
    mutationFn: (reason: string) =>
      apiFetch("/system/fallback/enable", {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast({ title: "Degraded mode enabled" });
      qc.invalidateQueries({ queryKey: ["system-mode"] });
    },
  });

  const disableDegradedMutation = useMutation({
    mutationFn: () =>
      apiFetch("/system/fallback/disable", { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Degraded mode disabled" });
      qc.invalidateQueries({ queryKey: ["system-mode"] });
    },
  });

  const d = deps?.dependencies ?? {};
  const pipeline = deps?.pipeline ?? {};
  const stateAdapters = deps?.stateAdapters ?? [];
  const isDegraded = mode?.degraded ?? false;

  const depEntries = Object.entries(d) as [string, { status: string; type: string; note: string }][];

  return (
    <div className="min-h-screen bg-gray-50">
      <DevBanner />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time status of all V6 subsystems and fallback services</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${isDegraded ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {isDegraded ? "⚠️ DEGRADED MODE" : "✅ NORMAL"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">API Status</div>
            <div className="flex items-center">
              <StatusDot status={health?.status ?? "..."} />
              <span className="font-bold text-lg">{health?.status ?? "…"}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">v{health?.version ?? "6.0.0"}</div>
          </div>
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Run Mode</div>
            <div className="font-bold text-lg">{mode?.runMode ?? "LOCAL_SPLIT"}</div>
            <div className="text-xs text-gray-400 mt-1">Mode B — no Docker</div>
          </div>
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Outbox Queue</div>
            <div className="font-bold text-lg text-orange-600">{pipeline?.outboxPendingJobs ?? 0} pending</div>
            <div className="text-xs text-gray-400 mt-1">{pipeline?.outboxDeadLetters ?? 0} dead-letters</div>
          </div>
        </div>

        {/* Dependency grid */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Infrastructure Dependencies</h2>
          <div className="space-y-3">
            {depsLoading ? (
              <div className="text-gray-400 text-sm">Loading…</div>
            ) : depEntries.map(([key, dep]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <StatusDot status={dep.status} />
                  <div>
                    <div className="font-medium text-sm text-gray-800">{dep.type}</div>
                    <div className="text-xs text-gray-400">{dep.note}</div>
                  </div>
                </div>
                <StatusBadge status={dep.status} />
              </div>
            ))}
          </div>
        </div>

        {/* State adapters */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">State Land Adapters</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2">Adapter</th>
                  <th className="text-left py-2">State</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Latency</th>
                  <th className="text-right py-2">Cache Hit</th>
                </tr>
              </thead>
              <tbody>
                {stateAdapters.map((a: any) => (
                  <tr key={a.adapter} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs">{a.adapter}</td>
                    <td className="py-2">{a.state}</td>
                    <td className="py-2"><StatusBadge status={a.status} /></td>
                    <td className="py-2 text-right">{a.latencyMs}ms</td>
                    <td className="py-2 text-right">{(a.cacheHitRate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Pipeline */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-3">AI Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Active Model</div>
              <div className="font-semibold text-gray-800 mt-0.5">{pipeline?.activeModelVersion ?? "v6.0-ensemble"}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Satellite Mode</div>
              <div className="font-semibold text-yellow-600 mt-0.5">SIM_DEV</div>
            </div>
            <div className={`rounded-lg p-3 ${pipeline?.modelDriftAlert ? "bg-red-50" : "bg-gray-50"}`}>
              <div className="text-xs text-gray-500">Model Drift</div>
              <div className={`font-semibold mt-0.5 ${pipeline?.modelDriftAlert ? "text-red-600" : "text-green-600"}`}>
                {pipeline?.modelDriftAlert ? "⚠️ ALERT" : "Normal"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Fallbacks Active</div>
              <div className="font-semibold text-yellow-600 mt-0.5">4 / 4</div>
            </div>
          </div>
        </div>

        {/* Degraded mode control */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Mode Control</h2>
          <p className="text-sm text-gray-500 mb-4">
            Degraded mode activates conservative thresholds and forces all uncertain claims to manual review.
            {isDegraded && <span className="ml-2 text-red-600 font-medium">Reason: {mode?.degradedReason}</span>}
          </p>
          <div className="flex gap-3">
            {isDegraded ? (
              <button
                onClick={() => disableDegradedMutation.mutate()}
                disabled={disableDegradedMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {disableDegradedMutation.isPending ? "Disabling…" : "Disable Degraded Mode"}
              </button>
            ) : (
              <button
                onClick={() => enableDegradedMutation.mutate("Manual admin override")}
                disabled={enableDegradedMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
              >
                {enableDegradedMutation.isPending ? "Enabling…" : "Enable Degraded Mode"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
