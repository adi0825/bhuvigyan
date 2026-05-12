import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Satellite, MapPin, Filter, RefreshCw } from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface FarmMarker {
  farmerId: string;
  farmerName: string;
  udlrn: string;
  lat: number;
  lng: number;
  ndvi: number;
  ndviLabel: string;
  district: string;
  crop: string;
  landAreaHa: number;
  floodDetected: boolean;
  lastScan: string;
}

const ndviColor = (v: number) => {
  if (v > 0.5) return "#22c55e";
  if (v > 0.3) return "#eab308";
  if (v > 0.15) return "#f97316";
  return "#ef4444";
};

export default function SatelliteAnalytics() {
  const [farms, setFarms] = useState<FarmMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState("");
  const [selectedFarm, setSelectedFarm] = useState<FarmMarker | null>(null);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/satellite/farms');
      const data = resp.data?.data || [];
      setFarms(data);
    } catch {
      toast.error("Failed to load satellite data");
    } finally {
      setLoading(false);
    }
  };

  const filteredFarms = farms.filter(f => !districtFilter || f.district === districtFilter);
  const districts = [...new Set(farms.map(f => f.district))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Satellite className="w-6 h-6 text-blue-600" /> Satellite Analytics</h1>
        <GovButton variant="outline" onClick={fetchFarms}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</GovButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Farms", value: farms.length },
          { label: "Healthy (NDVI>0.5)", value: farms.filter(f => f.ndvi > 0.5).length, color: "text-green-600" },
          { label: "Stressed", value: farms.filter(f => f.ndvi <= 0.5 && f.ndvi > 0.3).length, color: "text-yellow-600" },
          { label: "Critical", value: farms.filter(f => f.ndvi <= 0.15).length, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color || "text-gray-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
              <option value="">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Simulated Map */}
          <div className="relative bg-slate-100 rounded-xl overflow-hidden" style={{ height: 400 }}>
            <svg viewBox="0 0 400 300" className="w-full h-full">
              {/* Background grid */}
              {Array.from({ length: 10 }).map((_, i) => (
                <g key={i}>
                  <line x1={i * 40} y1={0} x2={i * 40} y2={300} stroke="#e2e8f0" strokeWidth={0.5} />
                  <line x1={0} y1={i * 30} x2={400} y2={i * 30} stroke="#e2e8f0" strokeWidth={0.5} />
                </g>
              ))}
              {/* Markers */}
              {filteredFarms.map(f => {
                const x = ((f.lng - 77.3) / 0.4) * 400;
                const y = 300 - ((f.lat - 13.0) / 0.4) * 300;
                return (
                  <g key={f.farmerId} onClick={() => setSelectedFarm(f)} className="cursor-pointer">
                    <circle cx={x} cy={y} r={12} fill={ndviColor(f.ndvi)} opacity={0.3} />
                    <circle cx={x} cy={y} r={6} fill={ndviColor(f.ndvi)} stroke="white" strokeWidth={2} />
                    <text x={x} y={y - 14} textAnchor="middle" fontSize="10" fill="#374151">{f.farmerName}</text>
                  </g>
                );
              })}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg p-2 text-xs shadow">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Healthy (&gt;0.5)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Stressed (0.3-0.5)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> Poor (0.15-0.3)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Critical (&lt;0.15)</div>
            </div>
          </div>
        </div>

        {/* Farm List */}
        <div className="bg-white rounded-xl shadow p-4 space-y-3 max-h-[500px] overflow-y-auto">
          <h3 className="font-bold text-gray-900">Farms by Anomaly</h3>
          {loading ? <p className="text-gray-500 text-sm">Loading...</p> :
            filteredFarms.sort((a, b) => a.ndvi - b.ndvi).map(f => (
              <button key={f.farmerId} onClick={() => setSelectedFarm(f)} className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedFarm?.farmerId === f.farmerId ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{f.farmerName}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: ndviColor(f.ndvi) }}>{f.ndvi.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500">{f.crop} · {f.district}</p>
              </button>
            ))}
        </div>
      </div>

      {/* Selected Farm Detail */}
      {selectedFarm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">Farm Detail: {selectedFarm.farmerName}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500 text-xs">NDVI</p><p className="font-bold text-lg" style={{ color: ndviColor(selectedFarm.ndvi) }}>{selectedFarm.ndvi}</p></div>
            <div><p className="text-gray-500 text-xs">Crop</p><p className="font-bold">{selectedFarm.crop}</p></div>
            <div><p className="text-gray-500 text-xs">District</p><p className="font-bold">{selectedFarm.district}</p></div>
            <div><p className="text-gray-500 text-xs">Coordinates</p><p className="font-mono text-xs">{selectedFarm.lat.toFixed(4)}, {selectedFarm.lng.toFixed(4)}</p></div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
