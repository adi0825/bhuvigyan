import { useState } from "react";
import { motion } from "framer-motion";
import { Satellite, Search, MapPin } from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import GovInput from "../../components/ui/GovInput";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useSatelliteData } from "../../hooks/useSatelliteData";
import BhumiAICard from "../../components/satellite/BhumiAICard";
import FarmSatelliteMap from "../../components/satellite/FarmSatelliteMap";

const STATES = ['Karnataka', 'Maharashtra', 'Andhra Pradesh', 'Tamil Nadu', 'Telangana', 'Gujarat', 'Punjab', 'Uttar Pradesh'];

const LOCATION_DATA: any = {
  Karnataka: {
    'Bengaluru Rural': { Doddaballapura: ['Hosahalli', 'Mylanahalli'], Devanahalli: ['Kundana', 'Nallurahalli'] },
    Tumkur: { Tumkur: ['Kunigal', 'Tiptur'], Sira: ['Pavagada', 'Madakasira'] },
    Bagalkot: { Bagalkot: ['Badami', 'Bilagi'], Jamkhandi: ['Rabakavi', 'Mudhol'] },
  },
};

export default function SatelliteAnalytics() {
  const [searchTab, setSearchTab] = useState<'udlrn' | 'region'>('udlrn');
  const [udlrn, setUdlrn] = useState('');
  const [region, setRegion] = useState({ state: 'Karnataka', district: '', taluk: '', village: '' });
  const [foundFarmer, setFoundFarmer] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { data: satData, loading: satLoading, error: satError, refetch } = useSatelliteData(foundFarmer?.farmer_id || null);

  const districts = Object.keys(LOCATION_DATA[region.state] || {});
  const taluks = region.district ? Object.keys(LOCATION_DATA[region.state]?.[region.district] || {}) : [];
  const villages = region.taluk ? (LOCATION_DATA[region.state]?.[region.district]?.[region.taluk] || []) : [];

  const handleUdlrnSearch = async () => {
    if (!udlrn.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setFoundFarmer(null);

    try {
      const res = await api.get('/admin/farm/search', { params: { udlrn } });
      setFoundFarmer(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'No farmer found with this UDLRN';
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRegionSearch = async () => {
    if (!region.district || !region.taluk || !region.village) {
      toast.error('Please select district, taluk, and village');
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setFoundFarmer(null);

    try {
      const res = await api.get('/admin/farm/search', {
        params: {
          state: region.state,
          district: region.district,
          taluk: region.taluk,
          village: region.village,
        }
      });
      setFoundFarmer(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'No farmer found in this region';
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
        <Satellite className="w-6 h-6 text-blue-600" />
        Satellite Analytics
      </h1>

      {/* Search Tabs */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
        <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
          <button
            onClick={() => { setSearchTab('udlrn'); setSearchError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchTab === 'udlrn' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Search by UDLRN
          </button>
          <button
            onClick={() => { setSearchTab('region'); setSearchError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchTab === 'region' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Search by Region
          </button>
        </div>

        {searchTab === 'udlrn' ? (
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Search Farm by UDLRN / ULPIN</div>
            <div className="flex gap-3">
              <GovInput
                value={udlrn}
                onChange={e => setUdlrn(e.target.value)}
                placeholder="Enter UDLRN e.g. KA-29-1234-56789"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleUdlrnSearch()}
              />
              <GovButton onClick={handleUdlrnSearch} disabled={!udlrn.trim() || searchLoading}>
                {searchLoading ? 'Searching...' : <><Search className="w-4 h-4 mr-1" /> Search</>}
              </GovButton>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Search Farm by Region</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={region.state}
                onChange={e => setRegion({ state: e.target.value, district: '', taluk: '', village: '' })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={region.district}
                onChange={e => setRegion(r => ({ ...r, district: e.target.value, taluk: '', village: '' }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">District</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={region.taluk}
                onChange={e => setRegion(r => ({ ...r, taluk: e.target.value, village: '' }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Taluk</option>
                {taluks.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={region.village}
                onChange={e => setRegion(r => ({ ...r, village: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Village</option>
                {villages.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <GovButton onClick={handleRegionSearch} disabled={searchLoading}>
                {searchLoading ? '...' : <><MapPin className="w-4 h-4 mr-1" /> Search</>}
              </GovButton>
            </div>
          </div>
        )}
        {searchError && (
          <div className="mt-3 text-sm text-red-600">
            ❌ {searchError}
          </div>
        )}
      </div>

      {/* Farmer Info Card */}
      {foundFarmer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow border border-gray-200 p-5"
        >
          <div className="text-sm font-semibold text-gray-800 mb-4">
            Farm Record — {foundFarmer.ulpin}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Farmer', foundFarmer.full_name],
              ['Mobile', foundFarmer.mobile],
              ['ULPIN', foundFarmer.ulpin || '--'],
              ['Survey No.', foundFarmer.survey_number],
              ['Village', foundFarmer.village],
              ['Taluk', foundFarmer.taluk],
              ['District', foundFarmer.district],
              ['State', foundFarmer.state],
              ['Land Area', `${foundFarmer.land_area_ha} Ha`],
              ['Ownership', foundFarmer.ownership_type],
              ['KGIS', foundFarmer.kgis_verified ? '✅ Verified' : '❌ Not verified'],
              ['Bank', foundFarmer.bank_verified ? '✅ Verified' : '❌ Not verified'],
              ['Status', foundFarmer.status],
              ['Coordinates', `${foundFarmer.farm_lat?.toFixed(4)}, ${foundFarmer.farm_lng?.toFixed(4)}`],
              ['Active Claims', foundFarmer.total_claims],
              ['Carbon Score', foundFarmer.carbon_score?.toFixed(1)]
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  {label}
                </div>
                <div className="text-sm font-medium text-gray-800 mt-0.5">
                  {value || '--'}
                </div>
              </div>
            ))}
          </div>

          {/* Active Claims */}
          {foundFarmer.active_claims?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                Active Claims
              </div>
              <div className="space-y-2">
                {foundFarmer.active_claims.map((c: any) => (
                  <div key={c.claim_number} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-gray-600">{c.claim_number}</span>
                    <span>{c.crop_type}</span>
                    <span className="font-semibold text-green-700">₹{c.claim_amount?.toLocaleString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.fraud_score_v1 > 60 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      Score: {c.fraud_score_v1?.toFixed(0) || '--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Satellite Data (same as farmer sees) */}
      {foundFarmer && (
        <div className="space-y-5">
          <div className="text-sm font-semibold text-gray-700">
            🌿 Satellite Analysis for {foundFarmer.ulpin}
            <span className="ml-2 text-xs font-normal text-gray-400">
              (same data the farmer sees)
            </span>
          </div>

          {satLoading ? (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center text-gray-400 text-sm animate-pulse">
              Fetching satellite data from GEE...
            </div>
          ) : satError ? (
            <div className="bg-white rounded-xl shadow border border-red-200 p-5">
              <div className="text-sm text-red-600 mb-3">
                ⚠️ Satellite data unavailable: {satError}
              </div>
              <GovButton variant="outline" onClick={() => refetch()}>
                Retry
              </GovButton>
            </div>
          ) : satData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <BhumiAICard
                data={satData}
                loading={satLoading}
                isCached={satData.cached}
                onRefresh={refetch}
              />
              <FarmSatelliteMap
                rgbTileUrl={satData.satellite_tile?.tile_url}
                ndviTileUrl={satData.ndvi_tile?.tile_url}
                center={{ lat: foundFarmer.farm_lat, lng: foundFarmer.farm_lng }}
                zoom={15}
                loading={!satData.satellite_tile?.tile_url}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
