import { useState, useEffect, useCallback } from 'react';
import { Activity, MapPin, AlertTriangle, Search, Loader2, Satellite } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import GovButton from '../../components/ui/GovButton';
import BhumiAICard from '../../components/satellite/BhumiAICard';
import NDVITrendChart from '../../components/satellite/NDVITrendChart';
import FarmSatelliteMap from '../../components/satellite/FarmSatelliteMap';
import { useSatelliteData } from '../../hooks/useSatelliteData';
import { useSatelliteTimeseries } from '../../hooks/useSatelliteTimeseries';
import { satelliteApi } from '../../api/satellite';
import { farmerApi } from '../../api/farmer';
import { lookupLand, getFarmerLand } from '../../api/land';
import { useAuth } from '../../auth/AuthContext';

export default function FarmerSatellite() {
  const { user } = useAuth();
  const [farmerId, setFarmerId] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [polygon, setPolygon] = useState<number[][] | undefined>(undefined);
  const [polygonArea, setPolygonArea] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (user?.userId) {
      setFarmerId(user.userId);
    }
  }, [user]);

  const { data: satData, loading: satLoading, error: satError, isCached, refetch } = useSatelliteData(farmerId);
  const { timeseries, loading: tsLoading } = useSatelliteTimeseries(farmerId, 12);
  const [tiles, setTiles] = useState<{ rgb_tile: string; ndvi_tile: string; center: { lat: number; lng: number }; zoom: number } | null>(null);

  const fetchPolygonData = useCallback(async () => {
    try {
      const landData = await getFarmerLand(farmerId);
      if (landData?.village) {
        const lookupResult = await lookupLand({
          state: landData.state_code || 'Karnataka',
          district: landData.district || '',
          taluk: landData.taluk || '',
          village: landData.village,
        });
        if (lookupResult?.polygons?.length > 0) {
          setPolygon(lookupResult.polygons[0]);
          setPolygonArea(lookupResult.polygonAreaHa);
        }
      }
    } catch (e) {
      console.log('Polygon fetch error:', e);
    }
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    satelliteApi.getFarmTiles(farmerId).then((res) => {
      const data = res.data?.data || res.data;
      if (data) {
        setTiles(data);
      }
    }).catch(() => {});
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    satelliteApi.getFarmThumbnail(farmerId).then((res) => {
      const data = res.data?.data || res.data;
      setThumbnail(data?.thumbnail_b64 || '');
    }).catch(() => {});
  }, [farmerId]);

  useEffect(() => {
    if (farmerId && satData?.farm_lat) {
      fetchPolygonData();
    }
  }, [farmerId, satData?.farm_lat, fetchPolygonData]);

  const analysis = satData?.satellite_analysis || satData;
  const thumbnailB64 = analysis?.thumbnail_b64 || satData?.thumbnail_b64 || thumbnail;
  const farmInfo = satData?.ulpin ? {
    ulpin: satData.ulpin,
    survey: satData.survey_number,
    area: satData.land_area_ha,
    lat: satData.farm_lat,
    lng: satData.farm_lng
  } : null;

  const isCoordError = satError?.toLowerCase?.().includes('coordinates') || satError?.toLowerCase?.().includes('land registration');

  const handleVerifyFromKGIS = async () => {
    setVerifying(true);
    try {
      const profileRes = await farmerApi.getProfile();
      const p = profileRes.data as any;
      if (p?.village && p?.district && p?.taluk) {
        await lookupLand({
          state: p.stateCode || 'Karnataka',
          district: p.district,
          taluk: p.taluk,
          village: p.village,
        });
        setVerifySuccess(true);
        setTimeout(() => refetch(), 500);
      }
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (satLoading && !satData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  if (satError && !satData) {
    return (
      <div className="space-y-6 max-w-6xl">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Satellite Intelligence</h1>
        <EmptyState
          icon={Activity}
          title={isCoordError ? "Land coordinates not set" : "Satellite data unavailable"}
          message={satError}
        />
        {isCoordError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="font-semibold text-amber-800">Complete Land Verification</p>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              Your farm coordinates are not registered. Click below to auto-resolve from KGIS using your declared village location.
            </p>
            {verifySuccess ? (
              <GovButton variant="outline" onClick={refetch}>
                <Satellite className="w-4 h-4 mr-1" /> Reload Satellite Data
              </GovButton>
            ) : (
              <GovButton variant="primary" onClick={handleVerifyFromKGIS} disabled={verifying}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
                {verifying ? 'Resolving from KGIS...' : 'Auto-Verify from KGIS'}
              </GovButton>
            )}
          </div>
        )}
      </div>
    );
  }

  const mapCenter = tiles?.center || (satData?.farm_lat && satData?.farm_lng
    ? { lat: satData.farm_lat, lng: satData.farm_lng }
    : { lat: 13.1234, lng: 77.5678 });

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">Satellite Intelligence</h1>

      {farmInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#1a6b3c]" />
            <h2 className="text-lg font-semibold">Farm Details</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">ULPIN</p>
              <p className="font-medium">{farmInfo.ulpin || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Survey No.</p>
              <p className="font-medium">{farmInfo.survey || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Area</p>
              <p className="font-medium">{farmInfo.area ? `${farmInfo.area} ha` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{farmInfo.lat?.toFixed(4)}, {farmInfo.lng?.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      <BhumiAICard
        data={analysis}
        loading={satLoading}
        isCached={isCached}
        onRefresh={refetch}
      />

      {thumbnailB64 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Satellite Image (5km radius)</h2>
            <span className="text-sm text-gray-500">Sentinel-2</span>
          </div>
          <img
            src={thumbnailB64}
            alt="Satellite view"
            className="w-full rounded-lg border border-gray-200"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NDVITrendChart data={timeseries} loading={tsLoading} />
        <FarmSatelliteMap
          rgbTileUrl={tiles?.rgb_tile}
          ndviTileUrl={tiles?.ndvi_tile}
          center={mapCenter}
          zoom={tiles?.zoom || 15}
          loading={!tiles && !satData}
          polygon={polygon}
          polygonAreaHa={polygonArea}
        />
      </div>
    </div>
  );
}
