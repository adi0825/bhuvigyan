import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Leaf, Smartphone, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FarmerLogin() {
  const { farmerLogin, farmerVerifyOtp, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await (farmerLogin(mobile) as Promise<{ data?: { devOtp?: string } } | void>);
      if (res && typeof res === "object" && "data" in res && (res as { data?: { devOtp?: string } }).data?.devOtp) {
        setDevOtp((res as { data: { devOtp: string } }).data.devOtp);
      }
      setStep("otp");
      toast({ title: "OTP sent to your WhatsApp" });
    } catch (err) {
      // If farmer doesn't exist, redirect to register
      const msg = (err as Error).message;
      if (msg.includes("not registered")) {
        navigate("/farmer/register");
        return;
      }
      setError(msg);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await farmerVerifyOtp(mobile, otp);
      navigate("/farmer/dashboard");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bhuvigyan</h1>
          <p className="text-sm text-muted-foreground mt-1">PMFBY Farmer Portal</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-7 shadow-lg">
          {step === "mobile" ? (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Login with Mobile</h2>
              </div>
              {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Mobile Number</label>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-muted border border-border border-r-0 rounded-l-lg text-sm text-muted-foreground">+91</span>
                    <input
                      type="tel" required maxLength={10} value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9XXXXXXXXX"
                      className="flex-1 px-3.5 py-2.5 text-sm bg-background border border-border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    />
                  </div>
                </div>
                <button type="submit" disabled={isLoading || mobile.length !== 10}
                  className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {isLoading ? "Sending OTP..." : "Send OTP via WhatsApp"}
                </button>
              </form>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <div className="font-semibold mb-1">Demo mobile numbers:</div>
                {["9900000001", "9900000002", "9900000003"].map((m) => (
                  <button key={m} onClick={() => setMobile(m)} className="block font-mono text-primary hover:underline">{m}</button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => { setStep("mobile"); setOtp(""); setError(""); }}
                  className="p-1 hover:bg-muted rounded transition-colors">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-semibold text-foreground">Enter OTP</h2>
              </div>
              {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>}
              <p className="text-sm text-muted-foreground mb-4">OTP sent to +91 {mobile}</p>
              {devOtp && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                  <span className="text-yellow-700 font-medium">Dev Mode OTP: </span>
                  <span className="font-mono text-yellow-800">{devOtp}</span>
                </div>
              )}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">6-digit OTP</label>
                  <input
                    type="text" required maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-center tracking-widest text-xl"
                  />
                </div>
                <button type="submit" disabled={isLoading || otp.length !== 6}
                  className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <button type="button" onClick={() => handleSendOtp({ preventDefault: () => {} } as React.FormEvent)}
                  className="w-full text-sm text-primary hover:underline">
                  Resend OTP
                </button>
              </form>
            </>
          )}
          <div className="mt-5 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">New farmer? <Link href="/farmer/register" className="text-primary hover:underline">Register here</Link></p>
            <Link href="/admin/login" className="text-xs text-muted-foreground hover:text-primary block mt-1">Officer login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
