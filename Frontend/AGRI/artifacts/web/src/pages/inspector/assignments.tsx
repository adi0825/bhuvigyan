import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  MapPin, Clock, AlertTriangle, Navigation, LogOut, CheckCircle2,
  Target, Activity, ChevronRight, Zap, Download,
} from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { cn } from "@/lib/utils";

interface CceAssignment {
  id: string; claimId: string; claimNumber: string; udlrn: string;
  farmerName?: string; districtName?: string;
  centroidLat?: number; centroidLng?: number;
  status: string; priority?: string;
  dueBy?: string; distanceKm?: number;
  damageType?: string; declaredCrop?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inspectorFetch<T>(path: string) {
  const token = localStorage.getItem("inspector_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); return j as T; });
}

function PriorityDot({ priority, overdue }: { priority?: string; overdue: boolean }) {
  if (overdue) return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />;
  if (priority === "HIGH") return <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />;
}

const DAMAGE_EMOJI: Record<string, string> = {
  FLOOD: "🌊", DROUGHT: "☀️", HAILSTORM: "🌨️", PEST_DISEASE: "🐛",
  CYCLONE: "🌀", UNSEASONAL_RAIN: "🌧️", FROST: "❄️",
};

export default function InspectorAssignments() {
  const [, navigate] = useLocation();
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsRequested, setGpsRequested] = useState(false);

  useEffect(() => {
    setGpsRequested(true);
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["inspector-assignments"],
    queryFn: () => inspectorFetch<{ data: CceAssignment[] }>("/v1/inspector/assignments"),
    refetchInterval: 60000,
  });

  function logout() {
    localStorage.removeItem("inspector_token");
    localStorage.removeItem("inspector_user");
    navigate("/inspector/login");
  }

  const user = JSON.parse(localStorage.getItem("inspector_user") ?? "{}");

  const assignments = (data?.data ?? []).map((a) => ({
    ...a,
    distanceKm: (userPos && a.centroidLat && a.centroidLng)
      ? haversineKm(userPos.lat, userPos.lng, Number(a.centroidLat), Number(a.centroidLng))
      : undefined,
  })).sort((a, b) => {
    const aOverdue = a.dueBy && new Date(a.dueBy) < new Date();
    const bOverdue = b.dueBy && new Date(b.dueBy) < new Date();
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return 0;
  });

  const overdueCount = assignments.filter((a) => a.dueBy && new Date(a.dueBy) < new Date()).length;
  const highPriCount = assignments.filter((a) => a.priority === "HIGH").length;
  const total = assignments.length;

  return (
    <div className="min-h-screen bg-background pb-6">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center justify-between mt-8 shadow">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm">My Assignments</div>
            <div className="text-xs text-sidebar-foreground/60">
              {user?.fullName ?? "Inspector"} · {userPos ? "GPS active" : "GPS off"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/inspector/analytics")} className="text-xs text-sidebar-foreground/70 hover:text-white px-2 py-1 rounded hover:bg-sidebar-accent">
            Analytics
          </button>
          <button onClick={logout} className="p-2 hover:bg-sidebar-accent rounded-lg"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Pending", value: total, icon: Activity, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
            { label: "Overdue", value: overdueCount, icon: Clock, color: "text-red-700", bg: overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-card border-border" },
            { label: "High Priority", value: highPriCount, icon: Zap, color: "text-orange-700", bg: highPriCount > 0 ? "bg-orange-50 border-orange-200" : "bg-card border-border" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-3 text-center", s.bg)}>
              <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
              <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* GPS prompt */}
        {gpsRequested && !userPos && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 text-sm text-yellow-700">
            <Navigation className="w-4 h-4 flex-shrink-0" /> Enable GPS for distance-based sorting and plot proximity
          </div>
        )}

        {/* Loading */}
        {isLoading && [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}

        {/* Assignment cards */}
        {assignments.map((a) => {
          const isOverdue = !!(a.dueBy && new Date(a.dueBy) < new Date());
          const isHigh = a.priority === "HIGH";
          const damageEmoji = DAMAGE_EMOJI[a.damageType ?? ""] ?? "📋";
          const dueDate = a.dueBy ? new Date(a.dueBy) : null;
          const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;

          return (
            <button
              key={a.id}
              onClick={() => navigate(`/inspector/visit/${a.id}`)}
              className={cn(
                "w-full text-left rounded-xl border p-4 space-y-3 transition-all hover:shadow-md active:scale-[0.99]",
                isOverdue ? "border-red-300 bg-red-50" :
                isHigh ? "border-orange-300 bg-orange-50" :
                "border-border bg-card hover:bg-muted/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-2xl leading-none mt-0.5 flex-shrink-0">{damageEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PriorityDot priority={a.priority} overdue={isOverdue} />
                      <span className="text-xs font-mono font-bold text-foreground">{a.claimNumber}</span>
                      {isHigh && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">HIGH</span>}
                      {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">OVERDUE</span>}
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">{a.farmerName ?? "Farmer"}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">
                      {a.declaredCrop} · {a.damageType?.replace(/_/g, " ").toLowerCase()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
                      window.open(`${base}/api/v1/evidence/${a.claimId}/pdf`, "_blank");
                    }}
                    className="p-1.5 hover:bg-sidebar-accent rounded-lg"
                    title="Download Evidence PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs flex-wrap">
                {a.distanceKm != null && (
                  <span className={cn(
                    "flex items-center gap-1 font-medium",
                    a.distanceKm < 2 ? "text-green-700" : a.distanceKm < 10 ? "text-yellow-600" : "text-muted-foreground",
                  )}>
                    <Navigation className="w-3 h-3" /> {a.distanceKm.toFixed(1)} km
                  </span>
                )}
                {a.centroidLat && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Target className="w-3 h-3" />
                    {Number(a.centroidLat).toFixed(3)}, {Number(a.centroidLng).toFixed(3)}
                  </span>
                )}
                {dueDate && (
                  <span className={cn(
                    "flex items-center gap-1",
                    isOverdue ? "text-red-600 font-medium" : daysUntilDue != null && daysUntilDue <= 2 ? "text-orange-600 font-medium" : "text-muted-foreground",
                  )}>
                    <Clock className="w-3 h-3" />
                    {isOverdue ? `Overdue by ${Math.abs(daysUntilDue ?? 0)}d` : `Due ${dueDate.toLocaleDateString("en-IN")}`}
                  </span>
                )}
              </div>

              {/* UDLRN mini badge */}
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">{a.udlrn}</span>
              </div>
            </button>
          );
        })}

        {!isLoading && assignments.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-3" />
            <div className="font-semibold text-foreground">All clear!</div>
            <div className="text-sm text-muted-foreground mt-1">No pending CCE assignments</div>
          </div>
        )}
      </div>
    </div>
  );
}
