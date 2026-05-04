import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, Download, MapPin, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";

export default function FarmerUdlrn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-land-detail"],
    queryFn: () => apiFetch<{ data: { udlrn: string; landOwnerName?: string; landAreaHa?: number; surveyNumber?: string; stateCode?: string; centroidLat?: number; centroidLng?: number; isFrozen?: boolean } }>("/v1/farmer/land"),
  });

  const land = data?.data;

  function copyUdlrn() {
    navigator.clipboard.writeText(land?.udlrn ?? "");
    toast({ title: "UDLRN copied" });
  }

  return (
    <div className="min-h-screen bg-background pt-8">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 sticky top-8 z-10">
        <button onClick={() => navigate("/farmer/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">My UDLRN</span>
      </header>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
        {isLoading && <div className="h-64 bg-muted rounded-2xl animate-pulse" />}
        {land && (
          <>
            {/* Main UDLRN card */}
            <div className="bg-gradient-to-br from-sidebar to-primary/80 rounded-2xl p-6 text-white text-center shadow-xl">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <div className="text-xs text-white/60 mb-2 tracking-widest uppercase">Unique Land Reference Number</div>
              <div className="text-3xl font-bold font-mono tracking-wider mb-1">{land.udlrn}</div>
              <div className="text-sm text-white/70 mt-1">{land.landOwnerName}</div>
              {land.isFrozen && (
                <div className="mt-3 bg-red-500/20 border border-red-300/30 rounded-lg px-3 py-1.5 text-sm text-red-200">
                  ⚠ UDLRN Frozen
                </div>
              )}
            </div>

            {/* QR code placeholder */}
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <div className="w-36 h-36 bg-muted rounded-xl mx-auto mb-3 flex items-center justify-center">
                <div className="text-xs text-muted-foreground font-mono text-center px-2">
                  [QR: {land.udlrn}]
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Scan at any CSC office or bank for instant verification</div>
            </div>

            {/* Details */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-2.5 text-sm">
              {[
                { label: "Owner", value: land.landOwnerName ?? "—" },
                { label: "Area", value: land.landAreaHa ? `${land.landAreaHa} Ha` : "—" },
                { label: "Survey No.", value: land.surveyNumber ?? "—" },
                { label: "State Code", value: land.stateCode ?? "—" },
                ...(land.centroidLat ? [{ label: "Location", value: `${Number(land.centroidLat).toFixed(4)}, ${Number(land.centroidLng).toFixed(4)}` }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium font-mono text-xs">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={copyUdlrn}
                className="flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                <Copy className="w-4 h-4" /> Copy UDLRN
              </button>
              <a href={`/api/v1/farmer/udlrn-pdf`}
                className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                <Download className="w-4 h-4" /> Download PDF
              </a>
            </div>
          </>
        )}
      </div>
      <FarmerBottomNav />
    </div>
  );
}
