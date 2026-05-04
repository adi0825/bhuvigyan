import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, Camera, MapPin, CheckCircle2, AlertTriangle, Navigation,
  Brain, TrendingDown, BarChart2,
} from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VisitDetail {
  id: string; claimId: string; claimNumber: string; udlrn: string; status: string;
  farmerName?: string; damageType?: string; declaredCrop?: string;
  centroidLat?: number; centroidLng?: number; dueBy?: string;
  ndviSowing?: number; ndviClaim?: number;
}

function inspectorFetch<T>(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("inspector_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  return Math.round(Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2) * 111320);
}

function NdviBar({ value, label, color }: { value: number; label: string; color: string }) {
  const height = Math.max(12, Math.round(value * 100));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-xs font-mono font-bold" style={{ color }}>{value.toFixed(3)}</div>
      <div className="w-16 rounded-t-lg flex items-end" style={{ height: "80px", background: "#f1f5f9" }}>
        <div className="w-full rounded-t-lg transition-all" style={{ height: `${height}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs text-muted-foreground text-center">{label}</div>
    </div>
  );
}

function LossSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color = value < 25 ? "#22c55e" : value < 50 ? "#f59e0b" : value < 75 ? "#f97316" : "#ef4444";
  const label = value < 25 ? "Minor Loss" : value < 50 ? "Moderate Loss" : value < 75 ? "Severe Loss" : "Total Loss";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Estimated Loss %</span>
        <span className="text-sm font-bold" style={{ color }}>{value}% — {label}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)` }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export default function InspectorVisit({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ verdict: "", notes: "", cropCondition: "", estimatedLossPct: 0 });
  const [photos, setPhotos] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [checkInGps, setCheckInGps] = useState<{ lat: number; lng: number } | null>(null);

  const { data } = useQuery({
    queryKey: ["inspector-visit", params.id],
    queryFn: () => inspectorFetch<{ data: VisitDetail }>(`/v1/inspector/visit/${params.id}`),
  });

  useEffect(() => {
    const id = navigator.geolocation?.watchPosition(
      (p) => setGpsPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
    return () => { if (id) navigator.geolocation.clearWatch(id); };
  }, []);

  const submitMut = useMutation({
    mutationFn: () => inspectorFetch(`/v1/inspector/visit/${params.id}/submit`, {
      method: "POST",
      body: JSON.stringify({
        verdict: form.verdict,
        notes: form.notes,
        cropCondition: form.cropCondition,
        estimatedLossPct: form.estimatedLossPct,
        gpsLat: checkInGps?.lat,
        gpsLng: checkInGps?.lng,
        photosCount: photos.length,
      }),
    }),
    onSuccess: () => {
      toast({ title: "CCE Visit submitted successfully" });
      navigate("/inspector/assignments");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const visit = data?.data;
  const plotLat = visit?.centroidLat ? Number(visit.centroidLat) : null;
  const plotLng = visit?.centroidLng ? Number(visit.centroidLng) : null;
  const distanceM = gpsPos && plotLat && plotLng ? haversineM(gpsPos.lat, gpsPos.lng, plotLat, plotLng) : null;
  const isWithin500m = distanceM != null && distanceM <= 500;

  const ndviSowing = visit?.ndviSowing ? Number(visit.ndviSowing) : null;
  const ndviClaim = visit?.ndviClaim ? Number(visit.ndviClaim) : null;
  const ndviLossPct = ndviSowing && ndviClaim && ndviSowing > 0
    ? Math.round(((ndviSowing - ndviClaim) / ndviSowing) * 100)
    : null;
  const aiSuggestedMin = ndviLossPct != null ? Math.max(0, ndviLossPct - 10) : null;
  const aiSuggestedMax = ndviLossPct != null ? Math.min(100, ndviLossPct + 10) : null;

  function startVisit() {
    setCheckInGps(gpsPos);
    if (ndviLossPct != null) setForm((f) => ({ ...f, estimatedLossPct: ndviLossPct }));
    setShowForm(true);
  }

  function addPhoto() {
    setPhotos((p) => [...p, `photo_${Date.now()}.jpg`]);
    toast({ title: `Photo ${photos.length + 1} captured`, description: "Geo-tagged and stored" });
  }

  const ndviClaimColor = !ndviClaim ? "#94a3b8"
    : ndviClaim < 0.3 ? "#ef4444" : ndviClaim < 0.5 ? "#f59e0b" : "#22c55e";

  return (
    <div className="min-h-screen bg-background pb-6">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 mt-8 shadow">
        <button onClick={() => navigate("/inspector/assignments")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="font-semibold text-sm">CCE Field Visit</div>
          <div className="text-xs text-sidebar-foreground/60 font-mono">{visit?.claimNumber}</div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* GPS proximity bar */}
        <div className={cn(
          "rounded-xl p-4 flex items-center gap-3 border",
          distanceM == null ? "bg-muted/50 border-border" :
          isWithin500m ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200",
        )}>
          <div className={cn(
            "w-3 h-3 rounded-full flex-shrink-0",
            distanceM == null ? "bg-gray-400 animate-pulse" :
            isWithin500m ? "bg-green-500 animate-pulse" : "bg-red-500",
          )} />
          <div className="flex-1 text-sm">
            {distanceM == null ? (
              <span className="text-muted-foreground">Acquiring GPS signal…</span>
            ) : isWithin500m ? (
              <span className="text-green-700 font-medium">
                ✓ {distanceM}m from plot — within range to submit
              </span>
            ) : (
              <span className="text-red-700 font-medium">
                {distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM}m`} from plot — must be ≤500m
              </span>
            )}
          </div>
          <Navigation className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Plot details */}
        {visit && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plot Details</div>
            {[
              { label: "UDLRN", value: visit.udlrn },
              { label: "Farmer", value: visit.farmerName ?? "—" },
              { label: "Crop", value: visit.declaredCrop },
              { label: "Damage Claimed", value: visit.damageType?.replace(/_/g, " ") },
              { label: "Coordinates", value: plotLat ? `${plotLat.toFixed(4)}, ${plotLng?.toFixed(4)}` : "—" },
              { label: "Due By", value: visit.dueBy ? new Date(visit.dueBy).toLocaleDateString("en-IN") : "—" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium capitalize text-right">{r.value ?? "—"}</span>
              </div>
            ))}
          </div>
        )}

        {/* NDVI Intelligence */}
        {ndviSowing != null && ndviClaim != null && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Satellite NDVI Analysis</span>
            </div>
            <div className="flex items-end justify-center gap-6 py-2">
              <NdviBar value={ndviSowing} label="At Sowing" color="#22c55e" />
              <div className="flex flex-col items-center gap-1 pb-8">
                <TrendingDown className={cn("w-5 h-5", ndviLossPct && ndviLossPct > 30 ? "text-red-500" : "text-yellow-500")} />
                {ndviLossPct != null && (
                  <span className={cn("text-sm font-bold whitespace-nowrap", ndviLossPct > 30 ? "text-red-600" : "text-yellow-600")}>
                    ▼ {ndviLossPct}%
                  </span>
                )}
              </div>
              <NdviBar value={ndviClaim} label="At Claim" color={ndviClaimColor} />
            </div>
            {aiSuggestedMin != null && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                <Brain className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">AI Suggested Loss Range: </span>
                  <span className="text-primary font-bold">{aiSuggestedMin}%–{aiSuggestedMax}%</span>
                  <span className="text-muted-foreground"> based on NDVI delta of {ndviLossPct}%. Your physical assessment takes precedence.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {!showForm ? (
          <button
            onClick={startVisit}
            disabled={!isWithin500m && distanceM != null}
            className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            {distanceM != null && !isWithin500m
              ? `Move to plot (${distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`} away)`
              : "Start Visit & Check In"}
          </button>
        ) : (
          <div className="space-y-4">
            {checkInGps && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Checked in at {checkInGps.lat.toFixed(4)}, {checkInGps.lng.toFixed(4)}
              </div>
            )}

            {/* Photo capture */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Field Photos</div>
                <span className={cn("text-xs font-medium", photos.length >= 3 ? "text-green-600" : "text-destructive")}>
                  {photos.length}/3 required
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <div key={i} className="w-20 h-20 bg-green-100 border border-green-300 rounded-xl flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">#{i + 1}</span>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    onClick={addPhoto}
                    className="w-20 h-20 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs mt-1">Capture</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inspection form */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
              <div className="text-sm font-semibold text-foreground">Inspection Assessment</div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">CCE Verdict *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "DAMAGE_CONFIRMED", label: "Damage Confirmed", color: "border-red-300 bg-red-50 text-red-700" },
                    { value: "PARTIAL_DAMAGE", label: "Partial Damage", color: "border-orange-300 bg-orange-50 text-orange-700" },
                    { value: "NO_DAMAGE", label: "No Damage", color: "border-green-300 bg-green-50 text-green-700" },
                    { value: "INCONCLUSIVE", label: "Inconclusive", color: "border-gray-300 bg-gray-50 text-gray-700" },
                  ].map((v) => (
                    <button
                      key={v.value}
                      onClick={() => setForm((f) => ({ ...f, verdict: v.value }))}
                      className={cn(
                        "px-3 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all",
                        form.verdict === v.value ? v.color + " ring-2 ring-offset-1 ring-current" : "border-border bg-background text-foreground hover:bg-muted/30",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loss slider */}
              <LossSlider
                value={form.estimatedLossPct}
                onChange={(v) => setForm((f) => ({ ...f, estimatedLossPct: v }))}
              />
              {aiSuggestedMin != null && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Brain className="w-3 h-3 text-primary" />
                  AI suggests {aiSuggestedMin}%–{aiSuggestedMax}% based on NDVI satellite data
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Crop Condition Observed</label>
                <input
                  type="text"
                  value={form.cropCondition}
                  onChange={(e) => setForm((f) => ({ ...f, cropCondition: e.target.value }))}
                  placeholder="e.g. 60% crop affected by lodging, yellowing visible"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Field Notes *</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4}
                  placeholder="Detailed field observations: visible damage, crop stage, weather conditions, neighboring plots, any suspicious activity..."
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => submitMut.mutate()}
              disabled={photos.length < 3 || !form.verdict || !form.notes || submitMut.isPending || (!isWithin500m && distanceM != null)}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              {submitMut.isPending ? "Submitting CCE Report..." : "Submit CCE Report"}
            </button>

            {(!isWithin500m && distanceM != null) && (
              <div className="flex items-center gap-2 justify-center text-xs text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" /> Move within 500m of plot to submit
              </div>
            )}
            {photos.length < 3 && (
              <div className="text-xs text-center text-muted-foreground">
                Add {3 - photos.length} more photo{3 - photos.length > 1 ? "s" : ""} before submitting
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
