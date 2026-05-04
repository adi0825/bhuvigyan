import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, CheckCircle2, AlertCircle, ChevronRight, Loader2,
  User, MapPin, Leaf, CloudRain, Calendar, DollarSign, Shield,
} from "lucide-react";
import { DevBanner } from "@/components/dev-banner";
import { cn } from "@/lib/utils";

const CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Soybean", "Groundnut", "Tur Dal", "Onion", "Potato"];
const DAMAGE_TYPES = [
  { id: "FLOOD", label: "Flood / Inundation", emoji: "🌊" },
  { id: "DROUGHT", label: "Drought / Dry Spell", emoji: "☀️" },
  { id: "HAILSTORM", label: "Hailstorm", emoji: "🌨️" },
  { id: "PEST_DISEASE", label: "Pest / Disease", emoji: "🐛" },
  { id: "CYCLONE", label: "Cyclone / Wind", emoji: "🌀" },
  { id: "UNSEASONAL_RAIN", label: "Unseasonal Rain", emoji: "🌧️" },
  { id: "LANDSLIDE", label: "Landslide / Soil Erosion", emoji: "⛰️" },
  { id: "FROST", label: "Cold Wave / Frost", emoji: "❄️" },
];
const SEASONS = [
  { value: "KHARIF-2024-25", label: "Kharif 2024-25", type: "KHARIF" },
  { value: "RABI-2024-25", label: "Rabi 2024-25", type: "RABI" },
  { value: "KHARIF-2025-26", label: "Kharif 2025-26", type: "KHARIF" },
];

interface FarmerResult {
  udlrn: string; fullName: string; mobile: string;
  landAreaHa?: number; landOwnerName?: string; surveyNumber?: string;
  isFrozen?: boolean; frozenReason?: string; isBlacklisted?: boolean; stateCode?: string;
}

function cscFetch<T>(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("csc_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.message ?? "Request failed");
    return j as T;
  });
}

function computeFraudRisk(form: { damageType: string; declaredCrop: string; claimAmount: string; landAreaHa: number }): number {
  let risk = 20;
  if (form.damageType === "DROUGHT" || form.damageType === "FLOOD") risk += 15;
  if (form.damageType === "PEST_DISEASE") risk += 25;
  const area = form.landAreaHa || 2.5;
  const requested = Number(form.claimAmount) || 0;
  const perHaRate = requested / area;
  if (perHaRate > 50000) risk += 30;
  else if (perHaRate > 35000) risk += 15;
  if (form.declaredCrop === "Cotton" && form.damageType === "PEST_DISEASE") risk += 10;
  return Math.min(95, Math.max(5, risk));
}

const STEPS = ["Farmer", "Crop & Damage", "Claim Details", "Submit"];

export default function CscClaimNew({ params: propParams }: { params?: { udlrn?: string } }) {
  const [, navigate] = useLocation();
  const routeParams = useParams<{ udlrn: string }>();
  const udlrn = propParams?.udlrn ?? routeParams?.udlrn ?? "";

  const [step, setStep] = useState(0);
  const [farmer, setFarmer] = useState<FarmerResult | null>(null);
  const [loadingFarmer, setLoadingFarmer] = useState(true);
  const [farmerError, setFarmerError] = useState("");

  const [form, setForm] = useState({
    declaredCrop: "",
    damageType: "",
    sowingDate: "",
    damageDate: "",
    season: "KHARIF-2024-25",
    claimAmount: "",
    insurerCode: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ claimId: string; claimNumber: string } | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!udlrn) { setFarmerError("No UDLRN provided"); setLoadingFarmer(false); return; }
    cscFetch<{ data: FarmerResult }>(`/v1/csc/farmer-lookup?q=${encodeURIComponent(udlrn)}`)
      .then((r) => {
        setFarmer(r.data);
        const area = Number(r.data.landAreaHa ?? 2.5);
        setForm((f) => ({ ...f, claimAmount: String(Math.round(area * 28000)) }));
      })
      .catch((e: Error) => setFarmerError(e.message))
      .finally(() => setLoadingFarmer(false));
  }, [udlrn]);

  const landAreaHa = Number(farmer?.landAreaHa ?? 2.5);
  const fraudRisk = farmer ? computeFraudRisk({ ...form, landAreaHa }) : 0;
  const riskColor = fraudRisk <= 30 ? "text-green-700" : fraudRisk <= 60 ? "text-yellow-600" : "text-red-600";
  const riskBg = fraudRisk <= 30 ? "bg-green-50 border-green-200" : fraudRisk <= 60 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const riskLabel = fraudRisk <= 30 ? "Low Risk" : fraudRisk <= 60 ? "Medium Risk" : "High Risk";

  const selectedSeason = SEASONS.find((s) => s.value === form.season);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const [season, seasonType] = [selectedSeason?.label?.split(" ")[0] ?? "KHARIF", selectedSeason?.type ?? "KHARIF"];
      const r = await cscFetch<{ data: { claimId: string; claimNumber: string } }>("/v1/csc/file-claim", {
        method: "POST",
        body: JSON.stringify({
          udlrn: farmer?.udlrn,
          declaredCrop: form.declaredCrop.toLowerCase(),
          damageType: form.damageType,
          sowingDate: form.sowingDate,
          damageDate: form.damageDate,
          claimAmountRequested: form.claimAmount,
          season: selectedSeason?.label?.replace(/\s/g, "-") ?? season,
          seasonType,
          insurerCode: form.insurerCode || undefined,
        }),
      });
      setResult(r.data);
      setStep(4);
    } catch (e: unknown) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const step2Valid = form.declaredCrop && form.damageType && form.sowingDate && form.damageDate;
  const step3Valid = form.claimAmount && Number(form.claimAmount) > 0 && form.season;

  return (
    <div className="min-h-screen bg-background">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 mt-8 shadow">
        <button onClick={() => step > 0 && step < 4 ? setStep(step - 1) : navigate("/csc/farmer-lookup")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="font-semibold text-sm">File Claim</div>
          <div className="text-xs text-sidebar-foreground/60 font-mono">{udlrn}</div>
        </div>
      </header>

      {/* Progress steps */}
      {step < 4 && (
        <div className="bg-sidebar/95 px-4 pb-3 flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  i < step ? "bg-primary text-white" :
                  i === step ? "bg-white text-primary" :
                  "bg-white/20 text-white/50",
                )}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn("text-[9px] font-medium", i === step ? "text-white" : "text-white/50")}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-1 mb-4", i < step ? "bg-primary" : "bg-white/20")} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Step 0: Farmer confirmation */}
        {step === 0 && (
          <>
            {loadingFarmer && <div className="h-48 bg-muted rounded-xl animate-pulse" />}
            {farmerError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-destructive">Lookup Failed</div>
                  <div className="text-xs text-destructive/80 mt-0.5">{farmerError}</div>
                </div>
              </div>
            )}
            {farmer && (
              <>
                {farmer.isFrozen && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> UDLRN Frozen — {farmer.frozenReason}
                  </div>
                )}
                {farmer.isBlacklisted && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> Farmer Blacklisted — Cannot file claims
                  </div>
                )}
                {!farmer.isFrozen && !farmer.isBlacklisted && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Farmer Verified — Eligible to file claim
                  </div>
                )}

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Farmer Details</span>
                  </div>
                  <div className="p-4 space-y-2.5 text-sm">
                    {[
                      { label: "Full Name", value: farmer.fullName },
                      { label: "Mobile", value: farmer.mobile },
                      { label: "UDLRN", value: <span className="font-mono text-xs">{farmer.udlrn}</span> },
                      { label: "Land Owner", value: farmer.landOwnerName ?? "—" },
                      { label: "Land Area", value: farmer.landAreaHa ? `${Number(farmer.landAreaHa).toFixed(2)} Ha` : "—" },
                      { label: "Survey No.", value: farmer.surveyNumber ?? "—" },
                      { label: "State", value: farmer.stateCode ?? "—" },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground shrink-0">{row.label}</span>
                        <span className="font-medium text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {!farmer.isFrozen && !farmer.isBlacklisted && (
                  <button
                    onClick={() => setStep(1)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
                  >
                    Confirm Farmer & Continue <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Step 1: Crop & Damage */}
        {step === 1 && (
          <>
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Declared Crop</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CROPS.map((crop) => (
                  <button
                    key={crop}
                    onClick={() => setForm((f) => ({ ...f, declaredCrop: crop }))}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                      form.declaredCrop === crop ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-background text-foreground hover:bg-muted/30",
                    )}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CloudRain className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Damage Type</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DAMAGE_TYPES.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setForm((f) => ({ ...f, damageType: dt.id }))}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors",
                      form.damageType === dt.id ? "border-primary bg-primary/10 font-medium" : "border-border bg-background hover:bg-muted/30",
                    )}
                  >
                    <span className="text-xl">{dt.emoji}</span>
                    <span className={form.damageType === dt.id ? "text-primary" : "text-foreground"}>{dt.label}</span>
                    {form.damageType === dt.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Key Dates</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sowing Date *</label>
                <input
                  type="date"
                  value={form.sowingDate}
                  onChange={(e) => setForm((f) => ({ ...f, sowingDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Damage Date *</label>
                <input
                  type="date"
                  value={form.damageDate}
                  onChange={(e) => setForm((f) => ({ ...f, damageDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Live fraud preview */}
            {form.declaredCrop && form.damageType && (
              <div className={cn("rounded-xl border p-4 space-y-2 transition-all", riskBg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Pre-Submission Fraud Preview</span>
                  </div>
                  <span className={cn("text-sm font-bold", riskColor)}>{riskLabel}</span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", fraudRisk <= 30 ? "bg-green-500" : fraudRisk <= 60 ? "bg-yellow-500" : "bg-red-500")}
                    style={{ width: `${fraudRisk}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">{fraudRisk}/100 · {riskLabel} — AI model will run a full scan after filing</div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!step2Valid}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Continue to Claim Details <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Step 2: Claim details */}
        {step === 2 && (
          <>
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Claim Amount & Season</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Claim Amount (₹) * <span className="text-primary">· Est: ₹{Math.round(landAreaHa * 28000).toLocaleString("en-IN")} for {landAreaHa.toFixed(2)} Ha</span>
                </label>
                <input
                  type="number"
                  value={form.claimAmount}
                  onChange={(e) => setForm((f) => ({ ...f, claimAmount: e.target.value }))}
                  placeholder="e.g. 70000"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Season *</label>
                <div className="space-y-2">
                  {SEASONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setForm((f) => ({ ...f, season: s.value }))}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors",
                        form.season === s.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-background text-foreground hover:bg-muted/30",
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="text-xs opacity-60">{s.type}</span>
                      {form.season === s.value && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Insurer Code (optional)</label>
                <input
                  type="text"
                  value={form.insurerCode}
                  onChange={(e) => setForm((f) => ({ ...f, insurerCode: e.target.value }))}
                  placeholder="e.g. AGRI_INSURE_KA"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Review summary */}
            <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-2 text-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Review Summary</div>
              {[
                { label: "Farmer", value: farmer?.fullName },
                { label: "UDLRN", value: <span className="font-mono text-xs">{farmer?.udlrn}</span> },
                { label: "Land Area", value: `${landAreaHa.toFixed(2)} Ha` },
                { label: "Crop", value: form.declaredCrop },
                { label: "Damage", value: DAMAGE_TYPES.find((d) => d.id === form.damageType)?.label },
                { label: "Sowing Date", value: form.sowingDate },
                { label: "Damage Date", value: form.damageDate },
                { label: "Season", value: selectedSeason?.label },
                { label: "Claim Amount", value: `₹${Number(form.claimAmount).toLocaleString("en-IN")}` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-start gap-4">
                  <span className="text-muted-foreground shrink-0">{row.label}</span>
                  <span className="font-medium text-right">{row.value ?? "—"}</span>
                </div>
              ))}
            </div>

            {/* Final fraud preview */}
            <div className={cn("rounded-xl border p-4 space-y-2", riskBg)}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Pre-filing Risk Score
                </span>
                <span className={cn("text-sm font-bold", riskColor)}>{fraudRisk}/100 — {riskLabel}</span>
              </div>
              <div className="h-2 bg-white/60 rounded-full">
                <div className={cn("h-full rounded-full", fraudRisk <= 30 ? "bg-green-500" : fraudRisk <= 60 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${fraudRisk}%` }} />
              </div>
            </div>

            {submitError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!step3Valid || submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Filing Claim...</> : "Submit Claim to V6 Pipeline"}
            </button>
          </>
        )}

        {/* Step 4: Success */}
        {step === 4 && result && (
          <div className="space-y-4 text-center py-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">Claim Filed!</div>
              <div className="text-sm text-muted-foreground mt-1">AI pipeline has started processing</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 text-left space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claim Number</span>
                <span className="font-mono font-bold text-foreground">{result.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Farmer</span>
                <span className="font-medium">{farmer?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UDLRN</span>
                <span className="font-mono text-xs">{farmer?.udlrn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crop / Damage</span>
                <span className="font-medium capitalize">{form.declaredCrop} / {form.damageType.replace(/_/g, " ").toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Requested</span>
                <span className="font-medium text-green-700">₹{Number(form.claimAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  V6 AI fraud analysis running — Farmer will be notified on completion
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/csc/farmer-lookup")}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors"
              >
                Search Another Farmer
              </button>
              <button
                onClick={() => navigate("/csc/dashboard")}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
