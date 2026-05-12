import { useState, useEffect } from "react";
import api from "../../api/axios";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const unread = notifs.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { limit: 50, offset: 0 } });
      setNotifs(res.data.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.put("/notifications/mark-all-read");
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const typeColors: Record<string, string> = {
    CLAIM_SUBMITTED: "bg-blue-50 text-blue-700",
    INSPECTION_ASSIGNED: "bg-yellow-50 text-yellow-700",
    CLAIM_APPROVED: "bg-green-50 text-green-700",
    CLAIM_REJECTED: "bg-red-50 text-red-700",
    FRAUD_ALERT: "bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-extrabold text-[#111827]">Notifications</h2>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-[13px] font-medium text-[#016B4B] hover:underline">Mark all as read</button>
        )}
      </div>
      <div className="space-y-3">
        {notifs.length === 0 && <p className="text-[#6B7280] text-center py-8">No notifications</p>}
        {notifs.map((n) => (
          <div key={n.id} onClick={() => markRead(n.id)} className={`bg-white rounded-xl border p-4 cursor-pointer transition ${n.isRead ? "border-[#F3F4F6] opacity-70" : "border-l-4 border-l-[#016B4B] border-[#E5E7EB]"}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[n.type] || "bg-gray-100 text-gray-700"}`}>{n.type.replace(/_/g, " ")}</span>
                  {!n.isRead && <span className="w-2 h-2 bg-[#EF4444] rounded-full" />}
                </div>
                <p className="font-bold text-[13px] text-[#111827]">{n.title}</p>
                <p className="text-[12px] text-[#6B7280]">{n.message}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
