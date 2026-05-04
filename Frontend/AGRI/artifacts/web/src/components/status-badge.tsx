import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  FILED: { label: "Filed", color: "bg-blue-100 text-blue-700" },
  LAND_VERIFIED: { label: "Land Verified", color: "bg-cyan-100 text-cyan-700" },
  SATELLITE_ANALYSIS: { label: "Analyzing", color: "bg-purple-100 text-purple-700" },
  FRAUD_SCORING: { label: "Scoring", color: "bg-indigo-100 text-indigo-700" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
  OFFICER_REVIEW: { label: "Under Review", color: "bg-yellow-100 text-yellow-700" },
  CCE_VISIT: { label: "CCE Visit", color: "bg-orange-100 text-orange-700" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
  REJECTED_FRAUD: { label: "Fraud Rejected", color: "bg-red-100 text-red-800 font-bold" },
  APPEALED: { label: "Appealed", color: "bg-violet-100 text-violet-700" },
  PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  ERROR: { label: "Error", color: "bg-gray-100 text-gray-600" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const info = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", info.color, className)}>
      {info.label}
    </span>
  );
}
