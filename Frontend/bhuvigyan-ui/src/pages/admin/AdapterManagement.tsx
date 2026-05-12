import { useState } from "react";

const mockAdapters = [
  { stateCode: "MH", name: "Maharashtra Default", minPhotos: 3, ndviThreshold: 0.35, areaTolerance: 12, active: true },
  { stateCode: "KA", name: "Karnataka Default", minPhotos: 1, ndviThreshold: 0.20, areaTolerance: 10, active: true },
  { stateCode: "TG", name: "Telangana Default", minPhotos: 1, ndviThreshold: 0.30, areaTolerance: 10, active: true },
  { stateCode: "PB", name: "Punjab Default", minPhotos: 1, ndviThreshold: 0.35, areaTolerance: 10, active: true },
  { stateCode: "UP", name: "Uttar Pradesh Default", minPhotos: 1, ndviThreshold: 0.28, areaTolerance: 10, active: true },
  { stateCode: "RJ", name: "Rajasthan Default", minPhotos: 1, ndviThreshold: 0.25, areaTolerance: 10, active: true },
];

export default function AdapterManagement() {
  const [adapters, setAdapters] = useState(mockAdapters);
  const [editing, setEditing] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<any>({});

  const startEdit = (adapter: any) => {
    setEditing(adapter.stateCode);
    setEditConfig({ ...adapter });
  };

  const save = () => {
    setAdapters((prev) => prev.map((a) => (a.stateCode === editing ? { ...a, ...editConfig } : a)));
    setEditing(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">State Adapter Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adapters.map((a) => (
          <div key={a.stateCode} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">{a.name}</h3>
                <p className="text-xs text-gray-500">{a.stateCode}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>{a.active ? "Active" : "Inactive"}</span>
            </div>
            {editing === a.stateCode ? (
              <div className="space-y-2 text-sm">
                <div><label className="text-gray-600">Min Photos</label><input type="number" className="w-full border rounded px-2 py-1" value={editConfig.minPhotos} onChange={(e) => setEditConfig({ ...editConfig, minPhotos: parseInt(e.target.value) })} /></div>
                <div><label className="text-gray-600">NDVI Threshold</label><input type="number" step="0.01" className="w-full border rounded px-2 py-1" value={editConfig.ndviThreshold} onChange={(e) => setEditConfig({ ...editConfig, ndviThreshold: parseFloat(e.target.value) })} /></div>
                <div><label className="text-gray-600">Area Tolerance %</label><input type="number" className="w-full border rounded px-2 py-1" value={editConfig.areaTolerance} onChange={(e) => setEditConfig({ ...editConfig, areaTolerance: parseInt(e.target.value) })} /></div>
                <div className="flex gap-2 pt-2">
                  <button onClick={save} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Save</button>
                  <button onClick={() => setEditing(null)} className="text-gray-500 text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <p><span className="text-gray-600">Min Photos:</span> {a.minPhotos}</p>
                <p><span className="text-gray-600">NDVI Threshold:</span> {a.ndviThreshold}</p>
                <p><span className="text-gray-600">Area Tolerance:</span> {a.areaTolerance}%</p>
                <button onClick={() => startEdit(a)} className="text-blue-600 text-xs hover:underline mt-2">Edit Config</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
