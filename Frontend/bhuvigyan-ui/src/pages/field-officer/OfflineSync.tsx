import { useState, useEffect } from "react";
import { Wifi, WifiOff, Upload, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface QueuedItem {
  id: string;
  type: "INSPECTION" | "PHOTO" | "GPS";
  claimId: string;
  claimNumber: string;
  status: "PENDING" | "UPLOADING" | "SYNCED" | "FAILED";
  timestamp: string;
  size: string;
}

const mockQueue: QueuedItem[] = [
  { id: "q1", type: "INSPECTION", claimId: "c1", claimNumber: "C-2026-10001", status: "SYNCED", timestamp: "2026-05-10T09:00:00Z", size: "2.3 KB" },
  { id: "q2", type: "PHOTO", claimId: "c1", claimNumber: "C-2026-10001", status: "PENDING", timestamp: "2026-05-10T10:30:00Z", size: "4.1 MB" },
  { id: "q3", type: "PHOTO", claimId: "c1", claimNumber: "C-2026-10001", status: "PENDING", timestamp: "2026-05-10T10:35:00Z", size: "3.8 MB" },
  { id: "q4", type: "GPS", claimId: "c2", claimNumber: "C-2026-10002", status: "PENDING", timestamp: "2026-05-10T11:00:00Z", size: "0.5 KB" },
  { id: "q5", type: "INSPECTION", claimId: "c2", claimNumber: "C-2026-10002", status: "FAILED", timestamp: "2026-05-10T08:00:00Z", size: "2.1 KB" },
];

export default function OfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedItem[]>(mockQueue);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const pendingCount = queue.filter((q) => q.status === "PENDING").length;
  const failedCount = queue.filter((q) => q.status === "FAILED").length;
  const totalSize = queue.filter((q) => q.status === "PENDING").reduce((sum, q) => sum + parseFloat(q.size), 0);

  const syncAll = async () => {
    if (!isOnline) return;
    setSyncing(true);
    // Simulate sync
    await new Promise((r) => setTimeout(r, 2000));
    setQueue((prev) =>
      prev.map((q) => (q.status === "PENDING" ? { ...q, status: "SYNCED" as const } : q))
    );
    setSyncing(false);
  };

  const retryFailed = async () => {
    setQueue((prev) =>
      prev.map((q) => (q.status === "FAILED" ? { ...q, status: "PENDING" as const } : q))
    );
    await syncAll();
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    UPLOADING: "bg-blue-100 text-blue-800",
    SYNCED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Offline Sync</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          {isOnline ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-red-500" />}
          <div>
            <p className="text-sm text-gray-500">Connection</p>
            <p className="font-semibold">{isOnline ? "Online" : "Offline"}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <Upload className="w-6 h-6 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="font-semibold">{pendingCount} items</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-sm text-gray-500">Failed</p>
            <p className="font-semibold">{failedCount} items</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Total pending size</p>
          <p className="font-semibold">{totalSize.toFixed(1)} MB</p>
        </div>
        <div className="flex gap-2">
          {failedCount > 0 && (
            <button onClick={retryFailed} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">
              <RefreshCw className="w-4 h-4" /> Retry Failed
            </button>
          )}
          <button onClick={syncAll} disabled={!isOnline || pendingCount === 0 || syncing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium">
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Sync All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Claim</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Size</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {queue.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{q.type}</td>
                <td className="px-4 py-3">{q.claimNumber}</td>
                <td className="px-4 py-3">{q.size}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[q.status]}`}>{q.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(q.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue.length === 0 && <p className="text-center text-gray-500 py-8">No queued items</p>}
      </div>
    </div>
  );
}
