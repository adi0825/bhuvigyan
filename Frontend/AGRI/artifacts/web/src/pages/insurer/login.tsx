import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { DevBanner } from "@/components/dev-banner";
import { Building2 } from "lucide-react";

export default function InsurerLogin() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ insurerCode: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ data: { token: string; insurer: object } }>("/v1/insurer/auth/login", {
        method: "POST", body: JSON.stringify(form),
      });
      localStorage.setItem("insurer_token", res.data.token);
      localStorage.setItem("insurer_user", JSON.stringify(res.data.insurer));
      navigate("/insurer/dashboard");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DevBanner />
      <div className="flex-1 flex items-center justify-center p-4 pt-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Insurer Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">PMFBY Insurance Provider Dashboard</p>
          </div>
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Insurer Code</label>
              <input type="text" value={form.insurerCode} onChange={(e) => setForm((f) => ({ ...f, insurerCode: e.target.value }))}
                placeholder="AGRI_INSURE_KA" required
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" required
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm" />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Demo: Code <span className="font-mono font-bold">AGRI_INSURE_KA</span> · Password <span className="font-mono font-bold">Insurer@123</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
