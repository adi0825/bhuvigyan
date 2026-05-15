import { useState, useEffect } from 'react';
import { Satellite, MapPin, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import { useRegionSatellite } from '../../hooks/useRegionSatellite';
import { satelliteApi } from '../../api/satellite';

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

export default function AdminSatellitePanel() {
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('Bengaluru Rural');
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

  const { data, loading, error, isCached, analyze } = useRegionSatellite();

  // Load states on mount
  useEffect(() => {
    satelliteApi.getStates().then((res) => {
      setStates(res.data.data || []);
    }).catch(() => {});
  }, []);

  const loadDistricts = async (s: string) => {
    try {
      const res = await satelliteApi.getDistricts(s);
      setDistricts(res.data.data || []);
    } catch {
      setDistricts([]);
    }
  };

  const handleStateSelect = (s: string) => {
    setState(s);
    setDistrict('');
    setShowStateDropdown(false);
    loadDistricts(s);
  };

  const handleAnalyze = () => {
    if (!state || !district || !startDate || !endDate) return;
    analyze(state, district, startDate, endDate);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Satellite className="w-7 h-7 text-[#1a6b3c]" />
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Satellite Analytics</h1>
      </div>

      {/* Controls */}
      <GovCard className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* State */}
          <div className="relative">
            <label className="text-xs font-semibold text-[#6b7280] uppercase">State</label>
            <button
              onClick={() => setShowStateDropdown(!showStateDropdown)}
              className="mt-1 w-full flex items-center justify-between bg-white border border-[#d1d5db] rounded-lg px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#6b7280]" />
                {state || 'Select state'}
              </span>
              <ChevronDown className="w-4 h-4 text-[#6b7280]" />
            </button>
            {showStateDropdown && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-[#e5e7eb] rounded-lg shadow-lg">
                {states.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStateSelect(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#f3f4f6]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* District */}
          <div className="relative">
            <label className="text-xs font-semibold text-[#6b7280] uppercase">District</label>
            <button
              onClick={() => setShowDistrictDropdown(!showDistrictDropdown)}
              className="mt-1 w-full flex items-center justify-between bg-white border border-[#d1d5db] rounded-lg px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#6b7280]" />
                {district || 'Select district'}
              </span>
              <ChevronDown className="w-4 h-4 text-[#6b7280]" />
            </button>
            {showDistrictDropdown && districts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-[#e5e7eb] rounded-lg shadow-lg">
                {districts.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDistrict(d); setShowDistrictDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#f3f4f6]"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs font-semibold text-[#6b7280] uppercase">From</label>
            <div className="mt-1 flex items-center gap-2 bg-white border border-[#d1d5db] rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-[#6b7280]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm outline-none bg-transparent"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-semibold text-[#6b7280] uppercase">To</label>
            <div className="mt-1 flex items-center gap-2 bg-white border border-[#d1d5db] rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-[#6b7280]" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading || !state || !district || !startDate || !endDate}
            className="bg-[#1a6b3c] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#14502d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Analyze Region
          </button>
          {isCached && (
            <span className="text-xs text-[#f59e0b] font-medium">Cached result</span>
          )}
        </div>
      </GovCard>

      {error && (
        <GovCard className="bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </GovCard>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GovCard className="text-center">
            <p className="text-xs text-[#6b7280] uppercase font-semibold">Mean NDVI</p>
            <p className="text-3xl font-bold text-[#1a6b3c] mt-1">{typeof data.mean_ndvi === 'number' ? data.mean_ndvi.toFixed(2) : '--'}</p>
            <p className="text-xs text-[#6b7280] mt-1">{data.health_label || '--'}</p>
          </GovCard>
          <GovCard className="text-center">
            <p className="text-xs text-[#6b7280] uppercase font-semibold">Mean NDWI</p>
            <p className="text-3xl font-bold text-[#2563eb] mt-1">{typeof data.mean_ndwi === 'number' ? data.mean_ndwi.toFixed(2) : '--'}</p>
          </GovCard>
          <GovCard className="text-center">
            <p className="text-xs text-[#6b7280] uppercase font-semibold">Stress Area</p>
            <p className="text-3xl font-bold text-[#ef4444] mt-1">{typeof data.stress_area_ha === 'number' ? data.stress_area_ha.toFixed(1) : '--'}</p>
            <p className="text-xs text-[#6b7280] mt-1">hectares</p>
          </GovCard>
          <GovCard className="text-center">
            <p className="text-xs text-[#6b7280] uppercase font-semibold">Time Series</p>
            <p className="text-3xl font-bold text-[#1a1a1a] mt-1">{data.timeseries?.length || 0}</p>
            <p className="text-xs text-[#6b7280] mt-1">data points</p>
          </GovCard>
        </div>
      )}

      {data && data.stress_zones.length > 0 && (
        <GovCard className="space-y-3">
          <h3 className="text-lg font-bold text-[#1a1a1a]">Crop Stress Zones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left py-2 px-3 text-[#6b7280] font-semibold">UDLRN</th>
                  <th className="text-left py-2 px-3 text-[#6b7280] font-semibold">NDVI</th>
                  <th className="text-left py-2 px-3 text-[#6b7280] font-semibold">Health</th>
                  <th className="text-left py-2 px-3 text-[#6b7280] font-semibold">Coords</th>
                </tr>
              </thead>
              <tbody>
                {data.stress_zones.map((zone, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    <td className="py-2 px-3 font-mono text-xs">{zone.udlrn}</td>
                    <td className="py-2 px-3">
                      <span
                        className="font-bold"
                        style={{ color: (zone.ndvi ?? 0) < 0.35 ? '#ef4444' : (zone.ndvi ?? 0) < 0.5 ? '#f59e0b' : '#22c55e' }}
                      >
                        {typeof zone.ndvi === 'number' ? zone.ndvi.toFixed(2) : '--'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{zone.label}</td>
                    <td className="py-2 px-3 text-xs text-[#6b7280]">
                      {typeof zone.lat === 'number' ? zone.lat.toFixed(4) : '--'}, {typeof zone.lng === 'number' ? zone.lng.toFixed(4) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GovCard>
      )}

      <p className="text-[11px] text-[#9ca3af] text-center">
        Sentinel-2 SR Harmonized · Google Earth Engine · Analysis for {state}, {district}
      </p>
    </div>
  );
}
