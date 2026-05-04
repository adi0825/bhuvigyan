import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Shield, Leaf, MapPin, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const TABS = [
  { path: "/farmer/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/farmer/claims", label: "Claims", icon: FileText },
  { path: "/farmer/udlrn", label: "UDLRN", icon: Shield },
  { path: "/farmer/land", label: "Land", icon: MapPin },
  { path: "/farmer/profile", label: "Profile", icon: User },
];

export function FarmerBottomNav() {
  const [location] = useLocation();

  const { data } = useQuery({
    queryKey: ["farmer-unread-count"],
    queryFn: () => apiFetch<{ data: { count: number } }>("/v1/farmer/notifications/unread-count"),
    refetchInterval: 30000,
  });
  const unread = data?.data?.count ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
        {TABS.map(({ path, label, icon: Icon }) => {
          const active = location === path || (path !== "/farmer/dashboard" && location.startsWith(path));
          const isBell = path === "/farmer/notifications";
          return (
            <Link key={path} href={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[48px] relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("w-5 h-5", active && "text-primary")} />
              <span className={cn("text-[10px] font-medium leading-tight", active && "text-primary")}>{label}</span>
            </Link>
          );
        })}
        <Link href="/farmer/notifications"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[48px] relative",
            location === "/farmer/notifications" ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center px-0.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <span className={cn("text-[10px] font-medium leading-tight", location === "/farmer/notifications" && "text-primary")}>Alerts</span>
        </Link>
      </div>
    </nav>
  );
}
