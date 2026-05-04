import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Leaf, Shield, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const { adminLogin, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "", totpCode: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await adminLogin(form.email, form.password, form.totpCode);
      navigate("/admin");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bhuvigyan</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">PMFBY Fraud Detection System</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-7 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Officer Sign In</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="officer@bhuvigyan.gov.in"
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">TOTP Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={form.totpCode}
                onChange={(e) => setForm((f) => ({ ...f, totpCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                placeholder="6-digit code"
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Demo Credentials</div>
            <div className="space-y-1 text-xs font-mono text-muted-foreground">
              <div>Email: superadmin@bhuvigyan.gov.in</div>
              <div>Password: Admin@123</div>
              <div>TOTP: 123456</div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link href="/farmer/login" className="text-xs text-muted-foreground hover:text-primary">
              Farmer portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
