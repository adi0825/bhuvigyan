import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { ArrowLeft, MapPin, Copy, Download, AlertCircle, Leaf, History } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";

interface LandDetail {
  udlrn: string; landOwnerName?: string; landAreaHa?: number; landUseType?: string;
  kgisAreaHa?: number; rtcAreaHa?: number; surveyNumber?: string;
  centroidLat?: number; centroidLng?: number;
  payoutBankName?: string; payoutIfsc?: string; payoutAccountNo?: string;
  isFrozen?: boolean; frozenReason?: string;
  carbonScore?: number; carbonEligible?: boolean; carbonEnrolled?: boolean;
  historicalCrops?: Array<{ season: string; crop: string; year: number }>;
  claimsHistory?: Array<{ id: string; claimNumber: string; status: string; declaredCrop: string; filedAt: string; approvedAmount?: number }>;
}

export default function FarmerLand() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["farmer-land-detail"],
    queryFn: () => apiFetch<{ data: LandDetail }>("/v1/farmer/land"),
  });

  const land = data?.data;

  function copyUdlrn() {
    navigator.clipboard.writeText(land?.udlrn ?? "");
    toast({ title: "UDLRN copied to clipboard" });
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-sidebar" />
      <div className="p-4 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 pt-8">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 sticky top-8 z-10">
        <button onClick={() => navigate("/farmer/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">My Land Record</span>
      </header>

      {error && (
        <div className="p-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">No land record found. Please register first.</div>
        </div>
      )}

      {land && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {/* UDLRN Card */}
          <div className={cn("rounded-xl border p-5", land.isFrozen ? "bg-red-50 border-red-200" : "bg-card border-border")}>
            {land.isFrozen && (
              <div className="flex items-center gap-2 mb-3 text-sm text-red-700 font-medium">
                <AlertCircle className="w-4 h-4" />
                UDLRN Frozen — {land.frozenReason}
              </div>
            )}
            <div className="text-xs text-muted-foreground mb-1">Unique Land Reference Number</div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold font-mono text-foreground tracking-wider">{land.udlrn}</div>
              <button onClick={copyUdlrn} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Area", value: land.landAreaHa ? `${land.landAreaHa} Ha` : "—" },
                { label: "Survey No.", value: land.surveyNumber ?? "—" },
                { label: "Carbon Score", value: land.carbonScore != null ? String(land.carbonScore) : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-muted/50 rounded-lg p-2.5">
                  <div className="font-bold text-foreground text-lg">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Land Details */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Land Information
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Owner Name</span><span className="font-medium">{land.landOwnerName ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Land Use</span><span className="capitalize">{land.landUseType?.toLowerCase() ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">KGIS Area</span><span>{land.kgisAreaHa ? `${land.kgisAreaHa} Ha` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">RTC Area</span><span>{land.rtcAreaHa ? `${land.rtcAreaHa} Ha` : "—"}</span></div>
              {land.centroidLat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates</span>
                  <span className="font-mono text-xs">{Number(land.centroidLat).toFixed(4)}, {Number(land.centroidLng).toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {land.payoutBankName && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">DBT Bank Account</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{land.payoutBankName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IFSC</span><span className="font-mono">{land.payoutIfsc}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-mono">****{land.payoutAccountNo?.slice(-4)}</span></div>
              </div>
            </div>
          )}

          {/* Carbon status teaser */}
          <div className={cn("rounded-xl border p-4", land.carbonEnrolled ? "bg-green-50 border-green-200" : "bg-card border-border")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className={cn("w-5 h-5", land.carbonEnrolled ? "text-green-600" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold text-foreground">Carbon Credits</div>
                  <div className="text-xs text-muted-foreground">
                    {land.carbonEnrolled ? "Enrolled — earning credits" : land.carbonEligible ? "Eligible — tap to enrol" : "Not eligible"}
                  </div>
                </div>
              </div>
              <Link href="/farmer/carbon" className="text-xs text-primary font-medium hover:underline">
                {land.carbonEnrolled ? "View credits" : land.carbonEligible ? "Enrol now" : "Learn more"}
              </Link>
            </div>
          </div>

          {/* Claims history */}
          {(land.claimsHistory ?? []).length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Insurance History</h2>
              </div>
              <div className="divide-y divide-border">
                {(land.claimsHistory ?? []).map((c) => (
                  <Link key={c.id} href={`/farmer/claims/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="text-xs font-mono font-medium text-foreground">{c.claimNumber}</div>
                      <div className="text-xs text-muted-foreground capitalize mt-0.5">{c.declaredCrop} · {new Date(c.filedAt).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      {c.approvedAmount && <span className="text-xs text-green-700 font-medium">₹{Number(c.approvedAmount).toLocaleString("en-IN")}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <FarmerBottomNav />
    </div>
  );
}
