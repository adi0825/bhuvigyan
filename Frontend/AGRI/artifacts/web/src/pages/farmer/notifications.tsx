import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";

interface Notification {
  id: string; title: string; message: string; channel: string;
  notificationType?: string; claimId?: string; readAt?: string; createdAt: string;
}

function groupByDate(items: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  items.forEach((n) => {
    const d = new Date(n.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    (groups[d] = groups[d] || []).push(n);
  });
  return groups;
}

export default function FarmerNotifications() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-notifications-full"],
    queryFn: () => apiFetch<{ data: Notification[] }>("/v1/farmer/notifications"),
  });

  const markAllMut = useMutation({
    mutationFn: () => apiFetch("/v1/farmer/notifications/mark-all-read", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["farmer-notifications-full"] }),
  });

  const markOneMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/farmer/notifications/mark-read/${id}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["farmer-notifications-full"] }),
  });

  const notifications = data?.data ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;
  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-background pb-20">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center justify-between sticky top-8 z-10 mt-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/farmer/dashboard")} className="p-1.5 hover:bg-sidebar-accent rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="font-semibold">Notifications</span>
            {unread > 0 && <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Bell className="w-12 h-12 text-muted mx-auto mb-3" />
            <div className="font-medium text-foreground">No notifications yet</div>
            <div className="text-sm text-muted-foreground mt-1">You'll be notified about your claims here</div>
          </div>
        )}

        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{date}</div>
            <div className="space-y-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.readAt) markOneMut.mutate(n.id);
                    if (n.claimId) navigate(`/farmer/claims/${n.claimId}`);
                  }}
                  className={cn(
                    "rounded-xl border p-4 cursor-pointer transition-colors",
                    !n.readAt ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm font-semibold", !n.readAt ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-xs text-muted-foreground mt-1.5">
                        {new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {!n.readAt && <span className="ml-2 font-semibold text-primary">• New</span>}
                      </div>
                    </div>
                    {n.claimId && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <FarmerBottomNav />
    </div>
  );
}
