import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { DevBanner } from "@/components/dev-banner";
import { Shield, Leaf, Eye, EyeOff } from "lucide-react";

export default function CscLogin() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ operatorCode: "", password: "", otp: "" });
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState<"creds" | "otp">("creds");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { requiresOtp: boolean } }>("/v1/csc/auth/pre-login", {
        method: "POST",
        body: JSON.stringify({ operatorCode: form.operatorCode, password: form.password }),
      });
      if (res.data?.requiresOtp) setStep("otp");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { token: string; operator: { id: string; fullName: string; operatorCode: string; isBlocked: boolean } } }>("/v1/csc/auth/login", {
        method: "POST",
        body: JSON.stringify({ operatorCode: form.operatorCode, password: form.password, otp: form.otp }),
      });
      if (res.data?.operator?.isBlocked) {
        navigate("/csc/blocked");
        return;
      }
      localStorage.setItem("csc_token", res.data.token);
      localStorage.setItem("csc_user", JSON.stringify(res.data.operator));
      navigate("/csc/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DevBanner />
      <div className="flex-1 flex items-center justify-center p-4 pt-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">CSC Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Common Service Centre — PMFBY Claims Filing</p>
          </div>

          {step === "creds" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">CSC Operator Code</label>
                <input type="text" value={form.operatorCode} onChange={(e) => setForm((f) => ({ ...f, operatorCode: e.target.value }))}
                  placeholder="CSC-KA-001" required
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Password" required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50">
                {loading ? "Verifying..." : "Continue"}
              </button>
              <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Demo: Code <span className="font-mono font-bold">CSC-KA-001</span> · Password <span className="font-mono font-bold">Csc@123</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground text-center">
                Enter OTP for <span className="font-mono font-bold text-foreground">{form.operatorCode}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">OTP</label>
                <input type="text" value={form.otp} onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value }))}
                  placeholder="123456" maxLength={6} required
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-center font-mono text-lg tracking-widest" />
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50">
                {loading ? "Logging in..." : "Login"}
              </button>
              <button type="button" onClick={() => setStep("creds")} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
