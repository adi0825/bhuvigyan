import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CROPS = ["paddy", "cotton", "soybean", "jowar", "bajra", "tur", "wheat", "gram", "mustard", "sugarcane", "groundnut", "maize", "sunflower", "onion", "tomato"];
const DAMAGE_TYPES = ["FLOOD", "DROUGHT", "HAIL", "CYCLONE", "PEST", "DISEASE", "FIRE", "LANDSLIDE", "UNSEASONAL_RAIN"];
const SEASONS = ["KHARIF-2025", "RABI-2025", "KHARIF-2024", "RABI-2024", "ANNUAL-2025"];

export default function FileClaim() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "review" | "submitted">("form");
  const [draftClaim, setDraftClaim] = useState<{ claimId: string; claimNumber: string } | null>(null);
  const [claimResult, setClaimResult] = useState<{ claimNumber: string; claimId: string; status: string } | null>(null);
  const [error, setError] = useState("");

  const { data: landData } = useQuery({
    queryKey: ["farmer-land"],
    queryFn: () => apiFetch<{ data: { udlrn: string; landAreaHa?: number; declaredCrop?: string } }>("/v1/farmer/land"),
  });

  const [form, setForm] = useState({
    declaredCrop: "",
    sowingDate: "",
    damageType: "",
    damageDate: "",
    claimAmountRequested: "",
    season: "KHARIF-2025",
    seasonType: "KHARIF",
    insurerCode: "AIC",
  });

  // Step 1: Create DRAFT claim
  const draftMut = useMutation({
    mutationFn: () => apiFetch<{ data: { claimId: string; claimNumber: string; status: string } }>("/v1/claims/file", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        udlrn: landData?.data.udlrn,
        claimAmountRequested: Number(form.claimAmountRequested),
      }),
    }),
    onSuccess: (res) => {
      setDraftClaim({ claimId: res.data.claimId, claimNumber: res.data.claimNumber });
      setStep("review");
    },
    onError: (e: Error) => setError(e.message),
  });

  // Step 2: Submit the claim
  const submitMut = useMutation({
    mutationFn: () => apiFetch<{ data: { claimId: string; claimNumber: string; status: string; message: string } }>(`/v1/claims/${draftClaim?.claimId}/submit`, {
      method: "POST",
    }),
    onSuccess: (res) => {
      setClaimResult({ claimId: res.data.claimId, claimNumber: res.data.claimNumber, status: res.data.status });
      setStep("submitted");
    },
    onError: (e: Error) => setError(e.message),
  });

  const inputClass = "w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  // Step 3: Claim submitted successfully
  if (step === "submitted" && claimResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Claim Submitted!</h2>
          <p className="text-sm text-muted-foreground mb-4">Your claim is being processed by our AI system</p>
          <div className="bg-muted rounded-lg p-3 mb-6">
            <div className="text-xs text-muted-foreground">Claim Number</div>
            <div className="text-lg font-mono font-bold text-foreground mt-0.5">{claimResult.claimNumber}</div>
          </div>
          <div className="text-xs text-muted-foreground mb-6">
            Satellite analysis and fraud scoring will complete within a few minutes. You'll be notified of the verdict.
          </div>
          <button onClick={() => navigate("/farmer/dashboard")} className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Review and confirm submission
  if (step === "review" && draftClaim) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setStep("form")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-semibold">Review Claim</span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-card border border-border rounded-xl p-4 mb-5">
            <h3 className="font-semibold text-foreground mb-3">Claim Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Season</span><span className="font-medium">{form.season}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Crop</span><span className="font-medium capitalize">{form.declaredCrop}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sowing Date</span><span className="font-medium">{form.sowingDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Damage Type</span><span className="font-medium">{form.damageType.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Damage Date</span><span className="font-medium">{form.damageDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claim Amount</span><span className="font-medium">₹{Number(form.claimAmountRequested).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">UDLRN</span><span className="font-medium font-mono">{landData?.data.udlrn}</span></div>
            </div>
          </div>

          {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

          <div className="bg-muted/50 rounded-lg p-3.5 text-xs text-muted-foreground mb-5">
            By submitting, you confirm that the information provided is true and accurate. False claims are subject to legal action under the PMFBY scheme.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("form")} className="flex-1 py-3 bg-muted text-foreground text-sm font-bold rounded-lg hover:bg-muted/80">
              Back
            </button>
            <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="flex-1 py-3 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {submitMut.isPending ? "Submitting..." : "Confirm & Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/farmer/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-primary" />
          <span className="font-semibold">File Claim</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {landData?.data && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 mb-5">
            <div className="text-xs text-muted-foreground">Filing claim for UDLRN</div>
            <div className="font-mono font-bold text-foreground">{landData.data.udlrn}</div>
            {landData.data.landAreaHa && <div className="text-xs text-muted-foreground mt-0.5">{landData.data.landAreaHa} Hectares</div>}
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); setError(""); draftMut.mutate(); }} className="space-y-4">
          <div>
            <label className={labelClass}>Season *</label>
            <select required value={form.season}
              onChange={(e) => {
                const s = e.target.value;
                setForm((f) => ({ ...f, season: s, seasonType: s.startsWith("KHARIF") ? "KHARIF" : s.startsWith("RABI") ? "RABI" : "ANNUAL" }));
              }}
              className={inputClass}>
              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Declared Crop *</label>
            <select required value={form.declaredCrop} onChange={(e) => setForm((f) => ({ ...f, declaredCrop: e.target.value }))} className={inputClass}>
              <option value="">Select Crop</option>
              {CROPS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Date of Sowing *</label>
            <input type="date" required value={form.sowingDate} onChange={(e) => setForm((f) => ({ ...f, sowingDate: e.target.value }))} max={new Date().toISOString().split("T")[0]} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Type of Damage *</label>
            <select required value={form.damageType} onChange={(e) => setForm((f) => ({ ...f, damageType: e.target.value }))} className={inputClass}>
              <option value="">Select Damage Type</option>
              {DAMAGE_TYPES.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Date of Damage *</label>
            <input type="date" required value={form.damageDate} onChange={(e) => setForm((f) => ({ ...f, damageDate: e.target.value }))} max={new Date().toISOString().split("T")[0]} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Claim Amount Requested (₹) *</label>
            <input type="number" required min="1000" max="500000" value={form.claimAmountRequested}
              onChange={(e) => setForm((f) => ({ ...f, claimAmountRequested: e.target.value }))}
              placeholder="e.g. 45000" className={inputClass} />
            <p className="text-xs text-muted-foreground mt-1">Maximum ₹5,00,000 per claim</p>
          </div>

          <div>
            <label className={labelClass}>Insurer</label>
            <select value={form.insurerCode} onChange={(e) => setForm((f) => ({ ...f, insurerCode: e.target.value }))} className={inputClass}>
              <option value="AIC">Agriculture Insurance Company (AIC)</option>
              <option value="NICL">New India Assurance Co. Ltd.</option>
              <option value="HDFC_ERGO">HDFC ERGO</option>
              <option value="SBI_GI">SBI General Insurance</option>
              <option value="BAJAJ_ALLIANZ">Bajaj Allianz</option>
            </select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3.5 text-xs text-muted-foreground">
            By submitting, you declare that the information provided is true and accurate. False claims are subject to legal action under the PMFBY scheme.
          </div>

          <button type="submit" disabled={draftMut.isPending} className="w-full py-3 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {draftMut.isPending ? "Creating Draft..." : "Continue to Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
