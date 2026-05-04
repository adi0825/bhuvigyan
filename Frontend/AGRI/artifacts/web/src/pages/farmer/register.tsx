import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { Leaf, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationItem { id?: string; code?: string; name: string; }

const STEPS = ["Personal Info", "Location", "Land & Banking", "Verify OTP"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < current ? "bg-primary text-white" : i === current ? "bg-primary text-white ring-4 ring-primary/20" : "bg-muted text-muted-foreground"}`}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < current ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function FarmerRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [otp, setOtp] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    mobile: "", fullName: "", preferredLanguage: "en",
    stateCode: "", districtId: "", talukId: "", hobliId: "", villageId: "",
    surveyNumber: "", payoutAccountNo: "", payoutIfsc: "",
  });

  const { data: states } = useQuery({
    queryKey: ["states"],
    queryFn: () => apiFetch<{ data: LocationItem[] }>("/v1/location/states"),
  });
  const { data: districts } = useQuery({
    queryKey: ["districts", form.stateCode],
    queryFn: () => apiFetch<{ data: LocationItem[] }>(`/v1/location/districts?stateCode=${form.stateCode}`),
    enabled: !!form.stateCode,
  });
  const { data: taluks } = useQuery({
    queryKey: ["taluks", form.districtId],
    queryFn: () => apiFetch<{ data: LocationItem[] }>(`/v1/location/taluks?districtId=${form.districtId}`),
    enabled: !!form.districtId,
  });
  const { data: hoblis } = useQuery({
    queryKey: ["hoblis", form.talukId],
    queryFn: () => apiFetch<{ data: LocationItem[] }>(`/v1/location/hoblis?talukId=${form.talukId}`),
    enabled: !!form.talukId,
  });
  const { data: villages } = useQuery({
    queryKey: ["villages", form.hobliId],
    queryFn: () => apiFetch<{ data: LocationItem[] }>(`/v1/location/villages?hobliId=${form.hobliId}`),
    enabled: !!form.hobliId,
  });

  const registerMut = useMutation({
    mutationFn: () => apiFetch<{ data: { farmerId: string; udlrn: string; devOtp?: string } }>("/v1/farmer/register", {
      method: "POST",
      body: JSON.stringify(form),
    }),
    onSuccess: (res) => {
      setFarmerId(res.data.farmerId);
      if (res.data.devOtp) setDevOtp(res.data.devOtp);
      setStep(3);
    },
    onError: (e: Error) => setError(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: () => apiFetch("/v1/farmer/verify-otp", { method: "POST", body: JSON.stringify({ mobile: form.mobile, otp }) }),
    onSuccess: () => {
      toast({ title: "Registration complete!", description: "You can now login with your mobile number." });
      navigate("/farmer/login");
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step < 2) setStep((s) => s + 1);
    else if (step === 2) registerMut.mutate();
  }

  const inputClass = "w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring";
  const selectClass = inputClass;
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3 shadow-lg">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Farmer Registration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">PMFBY Insurance Portal</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          <StepIndicator current={step} />

          {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}

          {step === 0 && (
            <form onSubmit={handleNext} className="space-y-4">
              <h2 className="text-base font-semibold text-foreground mb-4">Personal Information</h2>
              <div>
                <label className={labelClass}>Full Name *</label>
                <input type="text" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="As per Aadhaar" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mobile Number *</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-muted border border-border border-r-0 rounded-l-lg text-sm text-muted-foreground">+91</span>
                  <input type="tel" required maxLength={10} value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit number" className={`flex-1 px-3.5 py-2.5 text-sm bg-background border border-border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Preferred Language</label>
                <select value={form.preferredLanguage} onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value }))} className={selectClass}>
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              <h2 className="text-base font-semibold text-foreground mb-4">Land Location</h2>
              <div>
                <label className={labelClass}>State *</label>
                <select required value={form.stateCode} onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value, districtId: "", talukId: "", hobliId: "", villageId: "" }))} className={selectClass}>
                  <option value="">Select State</option>
                  {(states?.data ?? []).map((s) => <option key={s.code} value={s.code!}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>District *</label>
                <select required value={form.districtId} onChange={(e) => setForm((f) => ({ ...f, districtId: e.target.value, talukId: "", hobliId: "", villageId: "" }))} disabled={!form.stateCode} className={selectClass}>
                  <option value="">Select District</option>
                  {(districts?.data ?? []).map((d) => <option key={d.id} value={d.id!}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Taluk *</label>
                <select required value={form.talukId} onChange={(e) => setForm((f) => ({ ...f, talukId: e.target.value, hobliId: "", villageId: "" }))} disabled={!form.districtId} className={selectClass}>
                  <option value="">Select Taluk</option>
                  {(taluks?.data ?? []).map((t) => <option key={t.id} value={t.id!}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Hobli *</label>
                <select required value={form.hobliId} onChange={(e) => setForm((f) => ({ ...f, hobliId: e.target.value, villageId: "" }))} disabled={!form.talukId} className={selectClass}>
                  <option value="">Select Hobli</option>
                  {(hoblis?.data ?? []).map((h) => <option key={h.id} value={h.id!}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Village *</label>
                <select required value={form.villageId} onChange={(e) => setForm((f) => ({ ...f, villageId: e.target.value }))} disabled={!form.hobliId} className={selectClass}>
                  <option value="">Select Village</option>
                  {(villages?.data ?? []).map((v) => <option key={v.id} value={v.id!}>{v.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(0)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border text-sm rounded-lg hover:bg-muted">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-4">
              <h2 className="text-base font-semibold text-foreground mb-4">Land & Banking Details</h2>
              <div>
                <label className={labelClass}>Survey Number *</label>
                <input type="text" required value={form.surveyNumber} onChange={(e) => setForm((f) => ({ ...f, surveyNumber: e.target.value }))} placeholder="e.g. 123/A" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bank Account Number *</label>
                <input type="text" required value={form.payoutAccountNo} onChange={(e) => setForm((f) => ({ ...f, payoutAccountNo: e.target.value }))} placeholder="Account number" className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className={labelClass}>IFSC Code *</label>
                <input type="text" required value={form.payoutIfsc} onChange={(e) => setForm((f) => ({ ...f, payoutIfsc: e.target.value.toUpperCase() }))} placeholder="e.g. SBIN0001234" className={`${inputClass} font-mono uppercase`} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border text-sm rounded-lg hover:bg-muted">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={registerMut.isPending} className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {registerMut.isPending ? "Registering..." : "Register & Get OTP"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={(e) => { e.preventDefault(); verifyMut.mutate(); }} className="space-y-4">
              <h2 className="text-base font-semibold text-foreground mb-2">Verify OTP</h2>
              <p className="text-sm text-muted-foreground">OTP sent to +91 {form.mobile}</p>
              {devOtp && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                  <span className="text-yellow-700 font-medium">Dev Mode OTP: </span>
                  <span className="font-mono text-yellow-800 text-base font-bold">{devOtp}</span>
                </div>
              )}
              <div>
                <label className={labelClass}>Enter 6-digit OTP</label>
                <input type="text" required maxLength={6} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••" className={`${inputClass} text-center font-mono tracking-widest text-2xl`} />
              </div>
              <button type="submit" disabled={verifyMut.isPending || otp.length !== 6} className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {verifyMut.isPending ? "Verifying..." : "Complete Registration"}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Already registered? <Link href="/farmer/login" className="text-primary hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}
