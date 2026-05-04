import { cn } from "@/lib/utils";

interface FraudScoreBadgeProps {
  score: number | string | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function getFraudLevel(score: number): "critical" | "high" | "medium" | "low" | "none" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  if (score > 0) return "low";
  return "none";
}

export function getFraudLabel(score: number): string {
  const level = getFraudLevel(score);
  if (level === "critical") return "Critical";
  if (level === "high") return "High Risk";
  if (level === "medium") return "Medium";
  if (level === "low") return "Low Risk";
  return "Pending";
}

export function FraudScoreBadge({ score, size = "md", showLabel = false, className }: FraudScoreBadgeProps) {
  const numScore = typeof score === "string" ? parseFloat(score) : score;
  if (numScore == null || isNaN(numScore)) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground", className)}>
        Pending
      </span>
    );
  }

  const level = getFraudLevel(numScore);
  const colorMap = {
    critical: "bg-red-100 text-red-700 ring-1 ring-red-200",
    high: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
    medium: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200",
    low: "bg-green-100 text-green-700 ring-1 ring-green-200",
    none: "bg-gray-100 text-gray-500",
  };

  const sizeMap = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold", colorMap[level], sizeMap[size], className)}>
      <span className={cn("inline-block rounded-full", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", {
        "bg-red-500": level === "critical",
        "bg-orange-500": level === "high",
        "bg-yellow-500": level === "medium",
        "bg-green-500": level === "low",
        "bg-gray-400": level === "none",
      })} />
      {Math.round(numScore)}/100
      {showLabel && <span className="text-xs opacity-75">({getFraudLabel(numScore)})</span>}
    </span>
  );
}

export function FraudScoreBar({ score }: { score: number | string | null | undefined }) {
  const numScore = typeof score === "string" ? parseFloat(score) : score;
  if (numScore == null || isNaN(numScore)) return null;
  const level = getFraudLevel(numScore);
  const colorMap = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
    none: "bg-gray-300",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorMap[level])}
          style={{ width: `${Math.min(100, numScore)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-foreground w-10 text-right">{Math.round(numScore)}</span>
    </div>
  );
}
