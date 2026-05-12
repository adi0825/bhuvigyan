import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell, Send, Filter, CheckCircle, AlertTriangle, Info,
  Megaphone, MessageSquare, ChevronRight, Trash2
} from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "broadcast" | "targeted" | "alert" | "system";
  channel: string;
  targetAudience?: string;
  sentAt: string;
  readCount: number;
  totalCount: number;
  status: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ title: "", message: "", type: "broadcast" as string, channel: "in-app" as string, audience: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { admin: true, page: 1, limit: 50 } });
      const data = res.data?.data?.notifications || [];
      setNotifications(data.length > 0 ? data.map((n: any) => ({
        id: n.id, title: n.title, message: n.message, type: n.type || "system",
        channel: n.channel || "in-app", targetAudience: n.targetAudience,
        sentAt: n.createdAt || n.sentAt, readCount: n.readCount || 0,
        totalCount: n.totalCount || 100, status: n.status || "sent",
      })) : [
        { id: "n1", title: "PMFBY Enrollment Open", message: "Enroll before 31st July for Kharif 2026 coverage.", type: "broadcast", channel: "sms+push", sentAt: "2026-05-01T09:00:00Z", readCount: 845, totalCount: 1200, status: "sent" },
        { id: "n2", title: "Drought Alert - Tumkur", message: "IMD forecasts deficient rainfall. Monitor crops closely.", type: "alert", channel: "push", sentAt: "2026-05-10T14:00:00Z", readCount: 320, totalCount: 450, status: "sent" },
        { id: "n3", title: "Claim Approved", message: "Your claim CLM-2026-001 has been approved for ₹45,000.", type: "targeted", channel: "sms", sentAt: "2026-05-12T10:00:00Z", readCount: 1, totalCount: 1, status: "sent" },
      ]);
    } catch { toast.error("Failed to load notifications"); }
    finally { setLoading(false); }
  };

  const sendNotification = async () => {
    if (!compose.title || !compose.message) { toast.error("Title and message required"); return; }
    try {
      await api.post("/notifications", { ...compose });
      toast.success("Notification sent");
      setShowCompose(false);
      setCompose({ title: "", message: "", type: "broadcast", channel: "in-app", audience: "" });
      fetchData();
    } catch { toast.error("Failed to send"); }
  };

  const deleteNotification = async (id: string) => {
    try { await api.delete(`/notifications/${id}`); setNotifications(prev => prev.filter(n => n.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Delete failed"); }
  };

  const typeIcons: Record<string, any> = {
    broadcast: Megaphone, alert: AlertTriangle, targeted: MessageSquare, system: Info,
  };

  const filtered = notifications.filter(n => !filter || n.type === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-blue-600" /> Notifications & Alerts</h1>
        <GovButton variant="primary" onClick={() => setShowCompose(!showCompose)}><Send className="w-4 h-4 mr-1" /> Compose</GovButton>
      </div>

      {/* Compose Panel */}
      {showCompose && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="font-bold text-sm">New Notification</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input type="text" placeholder="Title" value={compose.title} onChange={e => setCompose({ ...compose, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={compose.type} onChange={e => setCompose({ ...compose, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="broadcast">Broadcast</option><option value="targeted">Targeted</option><option value="alert">Alert</option>
            </select>
            <select value={compose.channel} onChange={e => setCompose({ ...compose, channel: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="in-app">In-App</option><option value="sms">SMS</option><option value="push">Push</option><option value="sms+push">SMS + Push</option>
            </select>
            <input type="text" placeholder="Target audience (district, state, or all)" value={compose.audience} onChange={e => setCompose({ ...compose, audience: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Message body..." value={compose.message} onChange={e => setCompose({ ...compose, message: e.target.value })} className="w-full border rounded-lg p-3 text-sm min-h-[80px]" />
          <div className="flex gap-2">
            <GovButton variant="primary" onClick={sendNotification}>Send Notification</GovButton>
            <GovButton variant="outline" onClick={() => setShowCompose(false)}>Cancel</GovButton>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button onClick={() => setFilter("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filter ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>All</button>
        <button onClick={() => setFilter("broadcast")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === "broadcast" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>Broadcast</button>
        <button onClick={() => setFilter("alert")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === "alert" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>Alerts</button>
        <button onClick={() => setFilter("targeted")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === "targeted" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>Targeted</button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? <p className="p-8 text-center text-gray-500">Loading...</p>
        : filtered.length === 0 ? <p className="p-8 text-center text-gray-500">No notifications</p>
        : filtered.map(n => {
          const Icon = typeIcons[n.type] || Info;
          return (
            <div key={n.id} className="flex items-start gap-4 p-4 border-t border-gray-50 hover:bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm">{n.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${n.type === "alert" ? "bg-red-100 text-red-700" : n.type === "broadcast" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{n.type}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{n.message}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{new Date(n.sentAt).toLocaleDateString()}</span>
                  <span>{n.channel}</span>
                  {n.targetAudience && <span>Target: {n.targetAudience}</span>}
                  <span>{n.readCount}/{n.totalCount} read</span>
                </div>
              </div>
              <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
