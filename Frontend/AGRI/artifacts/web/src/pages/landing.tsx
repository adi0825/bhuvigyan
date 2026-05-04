import { Link } from "wouter";
import { Leaf, Shield, MapPin, BarChart2, CheckCircle2, ArrowRight, Smartphone } from "lucide-react";
import { DevBanner } from "@/components/dev-banner";

const features = [
  { icon: BarChart2, title: "AI Fraud Scoring", desc: "Satellite-powered NDVI analysis detects fraudulent claims automatically with 95%+ accuracy." },
  { icon: MapPin, title: "District Heatmaps", desc: "Real-time fraud hotspot mapping across India's agricultural districts for targeted enforcement." },
  { icon: Shield, title: "UDLRN System", desc: "Unique land reference numbers prevent duplicate claims and track historical crop data." },
  { icon: CheckCircle2, title: "Autonomous Verdicts", desc: "Low-risk claims approved instantly. High-risk claims routed to officers for review." },
];

const stats = [
  { value: "₹12,400 Cr", label: "Fraud Prevented" },
  { value: "94.2%", label: "Detection Accuracy" },
  { value: "2.3 Sec", label: "Avg. Processing Time" },
  { value: "28 States", label: "Coverage" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background pt-8">
      <DevBanner />
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-8 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Bhuvigyan</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/farmer/login" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted">
              <Smartphone className="w-4 h-4" /> Farmer Portal
            </Link>
            <Link href="/admin/login" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90">
              <Shield className="w-4 h-4" /> Officer Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-sidebar via-sidebar/90 to-primary/80 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered · Real-time · Government of India
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            PMFBY Fraud Detection<br />
            <span className="text-secondary">System</span>
          </h1>
          <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8">
            Satellite imagery + AI analysis detects fraudulent crop insurance claims before payout.
            Protecting India's farmers and ₹50,000 Cr in annual insurance premiums.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/farmer/login" className="flex items-center gap-2 bg-white text-sidebar font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors">
              <Smartphone className="w-5 h-5" /> Farmer Login
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/admin/login" className="flex items-center gap-2 bg-white/10 border border-white/20 font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors">
              <Shield className="w-5 h-5" /> Officer Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-b border-border py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every claim goes through a 4-stage autonomous pipeline powered by satellite data and machine learning
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-6 flex gap-4 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 border-t border-border py-16 px-6 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">Farmers can register and file claims. Officers can review the fraud dashboard.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/farmer/register" className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90">
              Register as Farmer
            </Link>
            <Link href="/admin/login" className="px-6 py-3 border border-border font-semibold rounded-xl hover:bg-muted">
              Officer Demo Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground">Bhuvigyan</span>
        </div>
        Ministry of Agriculture & Farmers Welfare, Government of India. PMFBY Fraud Detection System.
      </footer>
    </div>
  );
}
