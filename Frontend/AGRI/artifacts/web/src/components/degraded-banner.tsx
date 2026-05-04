import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function DegradedBanner() {
  const { data } = useQuery({
    queryKey: ["system-mode"],
    queryFn: () => apiFetch<{ degraded?: boolean; degradedReason?: string }>("/system/mode"),
    refetchInterval: 30000,
    retry: false,
  });

  if (!data?.degraded) return null;

  return (
    <div className="bg-orange-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 z-50">
      <span className="text-lg">⚠️</span>
      <strong>System Degraded:</strong>
      <span>{data.degradedReason ?? "Reduced capacity — some features may be slower or unavailable"}</span>
    </div>
  );
}
