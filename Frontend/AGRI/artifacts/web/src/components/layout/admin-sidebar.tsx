import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, ClipboardList, MapPin, Search, Users, FileText,
  LogOut, Shield, Leaf, ChevronRight, BarChart2, Building2,
  Sliders, Activity, Brain, MonitorCheck,
} from "lucide-react";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/review-queue", label: "Review Queue", icon: ClipboardList },
  { path: "/admin/heatmap", label: "Fraud Heatmap", icon: MapPin },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/admin/udlrn-search", label: "UDLRN Search", icon: Search },
  { path: "/admin/csc-operators", label: "CSC Operators", icon: Building2 },
  { path: "/admin/csc-activity", label: "CSC Activity", icon: MonitorCheck },
  { path: "/admin/carbon", label: "Carbon Intel", icon: Leaf },
  { path: "/admin/audit-log", label: "Audit Log", icon: FileText },
  { path: "/admin/officers", label: "Officers", icon: Users },
  { path: "/admin/rules", label: "Rule Management", icon: Sliders },
  { path: "/admin/system-health", label: "System Health", icon: Activity },
  { path: "/admin/model-registry", label: "Model Registry", icon: Brain },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">Bhuvigyan</div>
            <div className="text-xs text-sidebar-foreground/60">PMFBY Fraud Detection</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-primary text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-1">
          <div className="text-xs text-sidebar-foreground/50 mb-1">Signed in as</div>
          <div className="text-sm font-medium text-white truncate">{user?.name}</div>
          <div className="flex items-center gap-1 mt-1">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-xs text-sidebar-foreground/60">{user?.role?.replace(/_/g, " ")}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
