import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Ruler, Sprout, FileCheck, AlertCircle, Loader2, Search, Satellite,
  Droplets, ShieldCheck, ThermometerSun, Flame, Waves, Eye, TrendingUp,
  Leaf, CloudRain, Sun, Wind, Calendar, Crosshair, BarChart3, ChevronRight,
  Info, CheckCircle2, AlertTriangle, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Circle, Marker, Popup, useMap } from 'react-leaflet';
import GovCard from '../../components/ui/GovCard';
import EmptyState from '../../components/ui/EmptyState';
import GovButton from '../../components/ui/GovButton';
import { farmerApi } from '../../api/farmer';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';
import { useSatelliteData } from '../../hooks/useSatelliteData';
import 'leaflet/dist/leaflet.css';

interface LandRecord {
  summary: {
    owner_name: string;
    survey_number: string;
    hissa_number: string;
    area_acres: number;
    area_hectares: number;
    land_type: string;
    village: string;
    taluk: string;
    hobli: string;
    district: string;
    centroid_lat: number;
    centroid_lng: number;
    polygon_available: boolean;
    polygon_count: number;
    kgis_verified: boolean;
    rtc_success: boolean;
    rtc_source: string;
  };
  polygon: {
    found: boolean;
    survey_number: string;
    kgis_village_id: string;
    polygons: number[][][];
    centroid_lat: number;
    centroid_lng: number;
    area_ha_computed: number;
    polygon_count: number;
    geojson: any;
  };
  admin: any;
  rtc: any;
}

const HA_TO_ACRES = 2.47105;
function haToAcres(ha: number | string | undefined): string {
  const n = typeof ha === 'number' ? ha : parseFloat(ha || '0');
  if (isNaN(n) || n <= 0) return '—';
  return (n * HA_TO_ACRES).toFixed(2);
}

function ndviColor(val: number): string {
  if (val >= 0.6) return '#16a34a';
  if (val >= 0.4) return '#84cc16';
  if (val >= 0.2) return '#eab308';
  return '#dc2626';
}

function ndviLabel(val: number): string {
  if (val >= 0.6) return 'Excellent';
  if (val >= 0.4) return 'Good';
  if (val >= 0.2) return 'Fair';
  return 'Poor';
}

function getRecommendations(satData: any): string[] {
  const recs: string[] = [];
  const ndvi = satData?.ndvi?.ndvi;
  const ndwi = satData?.ndwi?.ndwi;
  const flood = satData?.sar_flood?.flood_detected;
  const fire = satData?.fire?.detected;

  if (ndvi != null) {
    if (ndvi < 0.2) {
      recs.push('Crop health is critical. Check for pest infestation or nutrient deficiency immediately.');
      recs.push('Consider consulting an agronomist for soil testing and fertiliser recommendation.');
    } else if (ndvi < 0.4) {
      recs.push('Crop health is below optimal. Increase irrigation and monitor for stress signs.');
    } else if (ndvi >= 0.6) {
      recs.push('Crop health is excellent. Maintain current irrigation and fertiliser schedule.');
    }
  }
  if (ndwi != null) {
    if (ndwi < -0.2) {
      recs.push('Soil moisture is very low. Increase irrigation frequency immediately.');
    } else if (ndwi < 0) {
      recs.push('Soil moisture is moderate. Schedule irrigation in next 2–3 days.');
    } else if (ndwi > 0.3) {
      recs.push('Soil moisture is adequate. Avoid over-irrigation to prevent waterlogging.');
    }
  }
  if (flood) {
    recs.push('⚠️ Flood detected in farm area. Assess damage and contact insurance officer.');
  }
  if (fire) {
    recs.push('🔥 Fire hotspot detected nearby. Monitor weather and keep fire breaks clear.');
  }
  if (recs.length === 0) {
    recs.push('Satellite data is healthy. Continue regular farm monitoring.');
  }
  return recs;
}

// Map layer controller component
function LayerController({ activeLayer, rgbTileUrl, ndviTileUrl }: {
  activeLayer: string;
  rgbTileUrl?: string;
  ndviTileUrl?: string;
}) {
  const map = useMap();
  useEffect(() => {
    // Force map refresh when layer changes
    setTimeout(() => { map.invalidateSize(); }, 100);
  }, [activeLayer, map]);
  return null;
}

export default function MyLand() {
  const { user } = useAuth();
  const farmerId = user?.userId || '';
  const { data: satData, loading: satLoading } = useSatelliteData(farmerId);

  const [landRecord, setLandRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [kgisVillageId, setKgisVillageId] = useState('');
  const [kgisVillageCode, setKgisVillageCode] = useState('');
  const [activeMapLayer, setActiveMapLayer] = useState<'satellite' | 'rgb' | 'ndvi' | 'hybrid'>('satellite');

  const [surveyNumber, setSurveyNumber] = useState('');
  const [hissaNumber, setHissaNumber] = useState('1');

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const r = await farmerApi.getProfile();
      const p = (r.data as any)?.data ?? r.data;
      setProfile(p);
      if (p?.surveyNumber) setSurveyNumber(p.surveyNumber);

      if (p?.village && p?.district && p?.taluk) {
        let kvId = '';
        // Only call admin-hierarchy if we have a proper numeric village code
        const villageCode = p.villageId || p.villageCode;
        if (villageCode && /^\d+$/.test(String(villageCode))) {
          try {
            const kgisRes = await api.get('/land/admin-hierarchy', {
              params: { code: villageCode, type: 'lgd' }
            });
            if (kgisRes?.data?.found) {
              setKgisVillageCode(kgisRes.data.village_code);
              kvId = kgisRes.data.village_code?.replace(/^0+/, '') || '';
              setKgisVillageId(kvId);
            }
          } catch { /* ignore */ }
        }

        if (p?.surveyNumber) {
          try {
            const res = await api.post('/land/fetch-rtc', {
              district: p.district, taluk: p.taluk, hobli: p.hobli || '',
              village: p.village, survey_number: p.surveyNumber, hissa_number: '1',
              kgis_village_id: kvId, lat: p.latitude, lng: p.longitude
            });
            setLandRecord(res.data);
          } catch (err: any) { console.log('RTC fetch failed:', err?.message); }
        }
      } else {
        setFetchError('Profile incomplete. Please update your land details (district, taluk, village).');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'Failed to fetch land record';
      setFetchError(msg);
    } finally { setLoading(false); }
  };

  const handleFetchRTC = async () => {
    if (!profile) return;
    setFetching(true); setFetchError(null);
    try {
      const res = await api.post('/land/fetch-rtc', {
        district: profile.district, taluk: profile.taluk, hobli: profile.hobli || '',
        village: profile.village, survey_number: surveyNumber, hissa_number: hissaNumber,
        kgis_village_id: kgisVillageId, kgis_village_code: kgisVillageCode,
        lat: profile.latitude, lng: profile.longitude
      });
      setLandRecord(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'Failed to fetch RTC';
      setFetchError(msg);
    } finally { setFetching(false); }
  };

  const summary = landRecord?.summary;
  const polygonData = landRecord?.polygon;
  const hasRealPolygon = polygonData?.found && polygonData?.polygons && polygonData.polygons.length > 0;
  // Check BOTH KGIS summary AND profile coordinates
  const hasCoords = (summary?.centroid_lat != null && summary?.centroid_lng != null)
    || (profile?.latitude != null && profile?.longitude != null);
  const center = useMemo(() => ({
    lat: summary?.centroid_lat ?? profile?.latitude ?? null,
    lng: summary?.centroid_lng ?? profile?.longitude ?? null
  }), [summary, profile]);

  const ndviVal = satData?.ndvi?.ndvi ?? null;
  const ndwiVal = satData?.ndwi?.ndwi ?? null;
  const recommendations = useMemo(() => getRecommendations(satData), [satData]);

  // GEE tile URLs from satellite data
  const rgbTileUrl = satData?.satellite_tile?.tile_url || '';
  const ndviTileUrl = satData?.ndvi_tile?.tile_url || '';

  // Build overlay tile URLs based on active layer
  const baseTileUrl = activeMapLayer === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState icon={MapPin} title="Profile not found" message="Please complete your profile to view land records." />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">My Land</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            {profile?.village && profile?.district
              ? `${profile.village}, ${profile.taluk}, ${profile.district}`
              : 'Complete your profile to see land details'}
          </p>
        </div>
        <GovButton variant="outline" size="sm" onClick={fetchInitialData}>
          <Satellite className="w-4 h-4 mr-1" /> Refresh from KGIS
        </GovButton>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GovCard className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-[#d1fae5] flex items-center justify-center shrink-0">
            <Ruler className="w-5 h-5 text-[#1a6b3c]" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Total Area</p>
            <p className="text-lg font-bold text-[#1a1a1a]">
              {summary?.area_hectares != null ? `${haToAcres(summary.area_hectares)} ac` : profile?.landAreaHa != null ? `${haToAcres(profile.landAreaHa)} ac` : '—'}
            </p>
            <p className="text-[10px] text-[#9ca3af]">
              {summary?.area_hectares != null ? `${summary.area_hectares} ha` : profile?.landAreaHa != null ? `${profile.landAreaHa} ha` : ''}
            </p>
          </div>
        </GovCard>

        <GovCard className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-[#dbeafe] flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Crop Type</p>
            <p className="text-lg font-bold text-[#1a1a1a]">{profile?.declaredCrop || 'Paddy'}</p>
          </div>
        </GovCard>

        <GovCard className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5 text-[#d97706]" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">RTC Status</p>
            <p className="text-lg font-bold text-[#1a1a1a]">{summary?.rtc_success ? 'Verified' : 'Pending'}</p>
          </div>
        </GovCard>

        <GovCard className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-[#f3e8ff] flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Coordinates</p>
            <p className="text-sm font-bold text-[#1a1a1a] font-mono">
              {center.lat != null && center.lng != null
                ? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`
                : 'Not set'}
            </p>
          </div>
        </GovCard>
      </div>

      {/* Main Content: Analysis + Map */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Satellite Analysis & Land Details */}
        <div className="xl:col-span-5 space-y-6">
          {/* Farm Health Score */}
          <GovCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#1a6b3c]" /> Farm Health Score
              </h3>
              {satLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
            </div>

            {ndviVal != null ? (
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path
                      className="transition-all duration-1000"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={ndviColor(ndviVal)}
                      strokeWidth="3"
                      strokeDasharray={`${Math.min(ndviVal * 100, 100)}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: ndviColor(ndviVal) }}>{ndviVal.toFixed(2)}</span>
                    <span className="text-[10px] text-[#6b7280]">NDVI</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: ndviColor(ndviVal) }}>
                    {ndviLabel(ndviVal)}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-1">
                    {ndviVal >= 0.6 ? 'Crop canopy is dense and healthy.' :
                     ndviVal >= 0.4 ? 'Moderate vegetation cover. Monitor closely.' :
                     'Low vegetation. Immediate attention needed.'}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-[#9ca3af]">
                    <Calendar className="w-3 h-3" />
                    Last scan: {satData?.ndvi?.scan_date || '—'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#6b7280]">No satellite data available yet.</div>
            )}
          </GovCard>

          {/* Satellite Metrics Grid */}
          <GovCard className="p-5">
            <h3 className="text-sm font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
              <Satellite className="w-4 h-4 text-blue-600" /> Satellite Analysis
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* NDVI */}
              <div className="p-3 rounded-xl border" style={{ borderColor: ndviVal != null ? ndviColor(ndviVal) + '30' : '#e5e7eb', background: ndviVal != null ? ndviColor(ndviVal) + '10' : '#f9fafb' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="w-4 h-4" style={{ color: ndviVal != null ? ndviColor(ndviVal) : '#9ca3af' }} />
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wide">NDVI</span>
                </div>
                <p className="text-xl font-bold" style={{ color: ndviVal != null ? ndviColor(ndviVal) : '#1a1a1a' }}>
                  {ndviVal != null ? ndviVal.toFixed(2) : '—'}
                </p>
                <p className="text-[10px] text-[#6b7280]">{satData?.ndvi?.health_label || 'No data'}</p>
              </div>

              {/* NDWI */}
              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wide">Soil Moisture</span>
                </div>
                <p className="text-xl font-bold text-blue-700">
                  {ndwiVal != null ? ndwiVal.toFixed(2) : '—'}
                </p>
                <p className="text-[10px] text-[#6b7280]">{satData?.ndwi?.moisture_status || satData?.ndwi?.label || 'Sentinel-2 NDWI'}</p>
              </div>

              {/* Flood */}
              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Waves className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wide">Flood Risk</span>
                </div>
                <p className="text-xl font-bold text-amber-700">
                  {satData?.sar_flood ? (satData.sar_flood.flood_detected ? 'High' : 'Low') : '—'}
                </p>
                <p className="text-[10px] text-[#6b7280]">
                  {satData?.sar_flood ? (satData.sar_flood.flood_detected ? `Area: ${satData.sar_flood.flood_area_ha ?? '--'} ha` : 'No flooding') : 'Sentinel-1 SAR'}
                </p>
              </div>

              {/* Fire */}
              <div className="p-3 rounded-xl border border-red-100 bg-red-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wide">Fire Alert</span>
                </div>
                <p className="text-xl font-bold text-red-700">
                  {satData?.fire ? (satData.fire.detected ? `${satData.fire.hotspot_count}` : 'None') : '—'}
                </p>
                <p className="text-[10px] text-[#6b7280]">
                  {satData?.fire ? (satData.fire.detected ? `Closest: ${satData.fire.closest_distance_km} km` : 'No hotspots') : 'VIIRS/Sentinel-3'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
                <ThermometerSun className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-[#6b7280] block">Image Date</span>
                  <span className="text-xs font-medium">{satData?.ndvi?.scan_date || '—'}</span>
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-[#6b7280] block">Cloud Cover</span>
                  <span className="text-xs font-medium">{satData?.ndvi?.cloud_cover_pct != null ? `${satData.ndvi.cloud_cover_pct}%` : '—'}</span>
                </div>
              </div>
            </div>
          </GovCard>

          {/* Recommendations */}
          <GovCard className="p-5">
            <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1a6b3c]" /> Farm Recommendations
            </h3>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-[#f0fdf4] rounded-lg border border-green-100">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1a2e1a] leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </GovCard>

          {/* Land Details */}
          <GovCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#1a6b3c]" /> Land Details
              </h3>
              {summary?.rtc_source === 'surepass' && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Official RTC</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-[#f9fafb] p-3 rounded-lg">
                <p className="text-[#6b7280] text-[10px] uppercase tracking-wide font-semibold">Survey Number</p>
                <input
                  type="text"
                  value={surveyNumber}
                  onChange={e => setSurveyNumber(e.target.value)}
                  className="font-mono font-semibold bg-transparent border-none p-0 focus:ring-0 w-full text-sm mt-1"
                />
              </div>
              <div className="bg-[#f9fafb] p-3 rounded-lg">
                <p className="text-[#6b7280] text-[10px] uppercase tracking-wide font-semibold">Hissa Number</p>
                <input
                  type="text"
                  value={hissaNumber}
                  onChange={e => setHissaNumber(e.target.value)}
                  className="font-mono font-semibold bg-transparent border-none p-0 focus:ring-0 w-full text-sm mt-1"
                />
              </div>
            </div>

            <GovButton variant="primary" className="w-full" onClick={handleFetchRTC} disabled={fetching}>
              {fetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              {fetching ? 'Fetching from KSRSAC...' : 'Fetch Land Record'}
            </GovButton>

            {fetchError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{fetchError}</span>
              </div>
            )}

            {summary && (
              <div className="mt-4 pt-4 border-t space-y-2.5">
                {[
                  { label: 'Owner Name', value: summary.owner_name || 'N/A' },
                  { label: 'Village', value: summary.village },
                  { label: 'Taluk / Hobli', value: `${summary.taluk} / ${summary.hobli || '—'}` },
                  { label: 'District', value: summary.district },
                  { label: 'Land Type', value: summary.land_type || 'Agricultural' },
                  { label: 'KGIS Verified', value: summary.kgis_verified ? 'Yes' : 'No' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-[#6b7280] text-xs">{item.label}</span>
                    <span className="font-medium text-[#1a1a1a]">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </GovCard>
        </div>

        {/* Right: Satellite Map */}
        <div className="xl:col-span-7">
          <GovCard className="h-full flex flex-col p-0 overflow-hidden">
            {/* Map Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-[#1a6b3c]" /> Farm Satellite View
                </h3>
                <p className="text-[11px] text-[#6b7280] mt-0.5">
                  {center.lat != null && center.lng != null
                    ? `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`
                    : 'Coordinates not available'}
                  {polygonData?.area_ha_computed && center.lat != null && <span> · {polygonData.area_ha_computed.toFixed(2)} ha</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {hasRealPolygon && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold uppercase">Exact Boundary</span>
                )}
                {/* Layer Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'satellite' as const, label: 'Sat', icon: Satellite },
                    { key: 'rgb' as const, label: 'RGB', icon: Eye },
                    { key: 'ndvi' as const, label: 'NDVI', icon: Leaf },
                    { key: 'hybrid' as const, label: 'Hybrid', icon: MapPin },
                  ].map(layer => (
                    <button
                      key={layer.key}
                      onClick={() => setActiveMapLayer(layer.key)}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-md transition-colors ${
                        activeMapLayer === layer.key ? 'bg-white text-[#1a6b3c] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={layer.label}
                    >
                      <layer.icon className="w-3 h-3" />
                      {layer.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-[480px] bg-gray-100 relative">
              {hasCoords ? (
                <MapContainer
                  center={[center.lat, center.lng]}
                  zoom={16}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <LayerController activeLayer={activeMapLayer} rgbTileUrl={rgbTileUrl} ndviTileUrl={ndviTileUrl} />

                  {/* Base layer */}
                  {activeMapLayer === 'satellite' && (
                    <TileLayer
                      attribution='&copy; Esri · Sentinel-2'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  )}
                  {activeMapLayer === 'hybrid' && (
                    <>
                      <TileLayer
                        attribution='&copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      />
                      <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        opacity={0.3}
                      />
                    </>
                  )}
                  {(activeMapLayer === 'rgb' || activeMapLayer === 'ndvi') && (
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  )}

                  {/* GEE RGB overlay */}
                  {activeMapLayer === 'rgb' && rgbTileUrl && (
                    <TileLayer
                      attribution="Sentinel-2 SR · GEE"
                      url={rgbTileUrl}
                      opacity={0.95}
                    />
                  )}

                  {/* GEE NDVI overlay */}
                  {activeMapLayer === 'ndvi' && ndviTileUrl && (
                    <TileLayer
                      attribution="Sentinel-2 NDVI · GEE"
                      url={ndviTileUrl}
                      opacity={0.9}
                    />
                  )}

                  {/* Hybrid NDVI overlay on satellite */}
                  {activeMapLayer === 'hybrid' && ndviTileUrl && (
                    <TileLayer
                      attribution="Sentinel-2 NDVI · GEE"
                      url={ndviTileUrl}
                      opacity={0.5}
                    />
                  )}

                  {/* Farm boundary */}
                  {hasRealPolygon ? (
                    polygonData.polygons.map((coords: any, i: number) => (
                      <Polygon
                        key={i}
                        positions={coords}
                        pathOptions={{
                          color: '#ffffff',
                          fillColor: '#1a6b3c',
                          fillOpacity: 0.25,
                          weight: 3,
                          dashArray: '5, 5',
                        }}
                      >
                        <Popup>
                          <div className="text-sm font-bold">Survey No: {summary!.survey_number}</div>
                          <div className="text-xs text-[#6b7280]">Area: {polygonData.area_ha_computed.toFixed(2)} ha</div>
                        </Popup>
                      </Polygon>
                    ))
                  ) : (
                    <Circle
                      center={[center.lat, center.lng]}
                      radius={150}
                      pathOptions={{
                        color: '#1a6b3c',
                        fillColor: '#1a6b3c',
                        fillOpacity: 0.15,
                        weight: 2,
                        dashArray: '5, 5',
                      }}
                    />
                  )}

                  {/* Center marker */}
                  <Marker position={[center.lat, center.lng]}>
                    <Popup>
                      <div className="text-sm font-semibold">{profile?.fullName || 'Farm Location'}</div>
                      <div className="text-xs text-[#6b7280]">
                        Lat: {center.lat.toFixed(5)}<br />
                        Lng: {center.lng.toFixed(5)}
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                  <Satellite className="w-16 h-16 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No coordinates available</p>
                  <p className="text-xs mt-1 max-w-xs">
                    Your profile does not have GPS coordinates. Please update your profile or re-register via the Land Verification Portal to enable satellite mapping.
                  </p>
                </div>
              )}
            </div>

            {/* Map Footer */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-[#9ca3af]">
              <div className="flex items-center gap-2">
                <Satellite className="w-3 h-3" />
                <span>Sentinel-2 SR Harmonized · Google Earth Engine · 10m resolution</span>
              </div>
              <div className="flex items-center gap-3">
                {hasRealPolygon
                  ? <span className="text-blue-600 font-medium">✓ Exact boundary from KGIS</span>
                  : hasCoords
                    ? <span>📍 Approximate location</span>
                    : <span className="text-red-500">No map data</span>
                }
              </div>
            </div>
          </GovCard>
        </div>
      </div>

      {/* 12-Parameter Grid from Shared Schema */}
      {profile?.landData && (
        <GovCard className="p-5">
          <h3 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1a6b3c]" /> Complete Land & Satellite Parameters
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-[#f0fdf4] rounded-lg border border-green-100">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Survey No</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.surveyNo || '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Village</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.village || '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Taluk</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.taluk || '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">District</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.district || '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">State</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.state || '—'}</p>
            </div>
            <div className="p-3 bg-[#f0fdf4] rounded-lg border border-green-100">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Land Area</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.area ? `${(profile.landData.area * 2.47105).toFixed(2)} ac` : '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Land Use</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.landUse || '—'}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">RTC Status</p>
              <p className="font-bold text-green-700">{profile.landData.rtcStatus || '—'}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">NDVI</p>
              <p className="font-bold text-green-700">{profile.landData.ndvi?.toFixed(2) || '—'}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Crop Health</p>
              <p className="font-bold text-green-700">{profile.landData.cropHealth || '—'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Crop Type</p>
              <p className="font-bold text-[#1a1a1a]">{profile.landData.cropType || '—'}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Soil Moisture</p>
              <p className="font-bold text-blue-700">{profile.landData.soilMoisture ? `${profile.landData.soilMoisture}%` : '—'}</p>
            </div>
          </div>
        </GovCard>
      )}

      {/* Bottom: Encumbrance Alert */}
      {landRecord?.rtc?.encumbrance && (
        <GovCard className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-semibold text-sm">Encumbrance Detected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This land has active encumbrances or mutations pending. This may affect insurance eligibility.
              </p>
            </div>
          </div>
        </GovCard>
      )}
    </div>
  );
}
