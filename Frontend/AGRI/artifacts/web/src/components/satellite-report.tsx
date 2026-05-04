import { Satellite, Cloud, Thermometer, AlertTriangle, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SatelliteReportData {
  claimId: string;
  claimNumber: string;
  dataSource: string;
  sensorType: string;
  acquisitionDate: string;
  cloudCoverPct: number;
  ndviSowing: number;
  ndviClaim: number;
  ndviLossPct: number;
  ndviBaseline10yr: number;
  ndviTimeline: Array<{ date: string; ndvi: number; source: string }>;
  sarFloodSignature: boolean;
  imdWeatherConfirmed: boolean;
  imdDisasterType?: string;
  interpretation: string;
  beforeImage: string;
  afterImage: string;
  qualityFlags: string[];
  centroidLat?: number;
  centroidLng?: number;
  landAreaHa?: number;
  historicalCrops?: string[];
}

interface SatelliteReportProps {
  data: SatelliteReportData;
  isAdmin?: boolean;
  compact?: boolean;
}

function NdviBar({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.min(Math.max(value * 100, 0), 100);
  return (
    <div className="flex-1">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="h-6 bg-muted rounded-full overflow-hidden relative">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {value.toFixed(3)}
        </span>
      </div>
    </div>
  );
}

function NdviTimeline({ timeline }: { timeline: Array<{ date: string; ndvi: number; source: string }> }) {
  const maxNdvi = Math.max(...timeline.map(t => t.ndvi), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-24">
        {timeline.map((t, i) => {
          const height = (t.ndvi / maxNdvi) * 100;
          const color = t.ndvi > 0.6 ? "#22c55e" : t.ndvi > 0.3 ? "#eab308" : "#ef4444";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{ height: `${height}%`, backgroundColor: color, minHeight: 4 }}
              />
              <span className="text-[9px] text-muted-foreground text-center leading-tight">
                {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Sowing</span>
        <span>Claim Date</span>
      </div>
    </div>
  );
}

export function SatelliteReport({ data, isAdmin = false, compact = false }: SatelliteReportProps) {
  const ndviColor = (val: number) => val > 0.6 ? "#22c55e" : val > 0.3 ? "#eab308" : "#ef4444";
  const cloudColor = data.cloudCoverPct > 50 ? "#ef4444" : data.cloudCoverPct > 30 ? "#eab308" : "#22c55e";

  if (compact) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Satellite className="w-4 h-4 text-primary" />
          Satellite Analysis
        </div>
        <div className="grid grid-cols-3 gap-2">
          <NdviBar value={data.ndviSowing} label="Sowing" color={ndviColor(data.ndviSowing)} />
          <NdviBar value={data.ndviClaim} label="Claim" color={ndviColor(data.ndviClaim)} />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Loss</div>
            <div className="h-6 bg-red-50 rounded-full flex items-center justify-center border border-red-200">
              <span className="text-xs font-bold text-red-700">{data.ndviLossPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          {data.interpretation}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Satellite className="w-5 h-5" />
          <span className="font-semibold">Satellite Evidence Report</span>
        </div>
        <div className="text-xs text-blue-100 mt-0.5">
          {data.claimNumber} · {data.dataSource}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* NDVI Before/After */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> NDVI Vegetation Analysis
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <NdviBar value={data.ndviSowing} label="At Sowing" color={ndviColor(data.ndviSowing)} />
            <NdviBar value={data.ndviClaim} label="At Claim" color={ndviColor(data.ndviClaim)} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.ndviLossPct.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Vegetation Loss</div>
            </div>
            <div className="flex-1 text-xs text-muted-foreground">
              {data.interpretation}
            </div>
          </div>
        </div>

        {/* NDVI Timeline */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">NDVI Timeline (Growing Season)</h3>
          <NdviTimeline timeline={data.ndviTimeline} />
        </div>

        {/* Satellite Parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Cloud Cover
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${data.cloudCoverPct}%`, backgroundColor: cloudColor }}
                />
              </div>
              <span className="text-sm font-bold" style={{ color: cloudColor }}>{data.cloudCoverPct.toFixed(0)}%</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Thermometer className="w-3 h-3" /> Baseline (10yr)
            </div>
            <div className="text-lg font-bold text-foreground">
              {data.ndviBaseline10yr.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Admin-only details */}
        {isAdmin && (
          <div className="space-y-2 border-t border-border pt-3">
            <h3 className="text-sm font-semibold text-foreground">Technical Parameters</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Sensor</span><span className="font-medium">{data.sensorType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Acquisition</span><span className="font-medium">{new Date(data.acquisitionDate).toLocaleDateString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SAR Flood</span><span className={cn("font-medium", data.sarFloodSignature ? "text-red-600" : "text-muted-foreground")}>{data.sarFloodSignature ? "Detected" : "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IMD Weather</span><span className={cn("font-medium", data.imdWeatherConfirmed ? "text-green-600" : "text-muted-foreground")}>{data.imdWeatherConfirmed ? "Confirmed" : "No data"}</span></div>
              {data.imdDisasterType && (
                <div className="flex justify-between col-span-2"><span className="text-muted-foreground">Disaster Type</span><span className="font-medium text-orange-600">{data.imdDisasterType}</span></div>
              )}
              {data.centroidLat && (
                <div className="flex justify-between col-span-2"><span className="text-muted-foreground">Coordinates</span><span className="font-mono">{data.centroidLat.toFixed(4)}, {data.centroidLng?.toFixed(4)}</span></div>
              )}
              {data.landAreaHa && (
                <div className="flex justify-between"><span className="text-muted-foreground">Land Area</span><span className="font-medium">{data.landAreaHa.toFixed(2)} Ha</span></div>
              )}
              {data.historicalCrops && data.historicalCrops.length > 0 && (
                <div className="flex justify-between col-span-2"><span className="text-muted-foreground">Historical Crops</span><span className="font-medium">{data.historicalCrops.join(", ")}</span></div>
              )}
            </div>

            {/* Quality Flags */}
            {data.qualityFlags.length > 0 && (
              <div className="space-y-1.5 mt-3">
                <div className="text-xs font-medium text-muted-foreground">Quality Flags</div>
                <div className="flex flex-wrap gap-1">
                  {data.qualityFlags.map((flag) => (
                    <span key={flag} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* IMD Confirmation */}
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg border",
          data.imdWeatherConfirmed
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        )}>
          {data.imdWeatherConfirmed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <div className="font-semibold text-foreground">
              {data.imdWeatherConfirmed ? "IMD Weather Confirmed" : "No IMD Corroboration"}
            </div>
            <div className="text-muted-foreground mt-0.5">
              {data.imdWeatherConfirmed
                ? `India Meteorological Department confirms ${data.imdDisasterType || "weather event"} in the region.`
                : "No weather event data available from IMD for the claim period."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
