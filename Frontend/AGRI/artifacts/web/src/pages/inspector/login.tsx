import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { DevBanner } from "@/components/dev-banner";
import { MapPin, Leaf } from "lucide-react";

export default function InspectorLogin() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", otp: "" });
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/v1/inspector/auth/request-otp", { method: "POST", body: JSON.stringify({ email: form.email }) });
      setStep("otp");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { token: string; inspector: object } }>("/v1/inspector/auth/login", {
        method: "POST", body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      localStorage.setItem("inspector_token", res.data.token);
      localStorage.setItem("inspector_user", JSON.stringify(res.data.inspector));
      navigate("/inspector/assignments");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DevBanner />
      <div className="flex-1 flex items-center justify-center p-4 pt-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Inspector App</h1>
            <p className="text-sm text-muted-foreground mt-1">CCE Field Inspector Portal</p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="inspector@state.gov.in" required
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm" />
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50">
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
              <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Demo: <span className="font-mono font-bold">inspector.ka@bhuvigyan.gov.in</span> · OTP: <span className="font-mono font-bold">123456</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground text-center">
                OTP sent to <span className="font-bold text-foreground">{form.email}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">OTP</label>
                <input type="text" value={form.otp} onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value }))}
                  placeholder="123456" maxLength={6} required
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-center font-mono text-xl tracking-widest" />
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
                {loading ? "Verifying..." : "Login"}
              </button>
              <button type="button" onClick={() => setStep("email")} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
