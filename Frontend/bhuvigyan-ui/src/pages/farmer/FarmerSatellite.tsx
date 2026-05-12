import { useState, useEffect } from 'react';
import { Activity, MapPin, Calendar, Droplets, AlertTriangle, Flame } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import BhumiAICard from '../../components/satellite/BhumiAICard';
import NDVITrendChart from '../../components/satellite/NDVITrendChart';
import FarmSatelliteMap from '../../components/satellite/FarmSatelliteMap';
import { useSatelliteData } from '../../hooks/useSatelliteData';
import { useSatelliteTimeseries } from '../../hooks/useSatelliteTimeseries';
import { satelliteApi } from '../../api/satellite';

export default function FarmerSatellite() {
  const [farmerId, setFarmerId] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string>('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFarmerId(user.userId || '');
      } catch {}
    }
  }, []);

  const { data: satData, loading: satLoading, error: satError, isCached, refetch } = useSatelliteData(farmerId);
  const { timeseries, loading: tsLoading } = useSatelliteTimeseries(farmerId, 12);
  const [tiles, setTiles] = useState<{ rgb_tile: string; ndvi_tile: string; center: { lat: number; lng: number }; zoom: number } | null>(null);

  useEffect(() => {
    if (!farmerId) return;
    satelliteApi.getFarmTiles(farmerId).then((res) => {
      setTiles(res.data.data || null);
    }).catch(() => {});
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    satelliteApi.getFarmThumbnail(farmerId).then((res) => {
      setThumbnail(res.data.data?.thumbnail_b64 || '');
    }).catch(() => {});
  }, [farmerId]);

  // Extract satellite analysis from new response structure
  const analysis = satData?.satellite_analysis || satData;
  const thumbnailB64 = analysis?.thumbnail_b64 || satData?.thumbnail_b64 || thumbnail;
  const farmInfo = satData?.udlrn ? {
    udlrn: satData.udlrn,
    crop: satData.declared_crop,
    area: satData.land_area_ha,
    lat: satData.gps_lat,
    lng: satData.gps_lng
  } : null;

  if (satLoading && !satData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  if (satError && !satData) {
    return (
      <EmptyState
        icon={Activity}
        title="Satellite data unavailable"
        message={satError}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">Satellite Intelligence</h1>

      {/* Farm Info Card */}
      {farmInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#1a6b3c]" />
            <h2 className="text-lg font-semibold">Farm Details</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">UDLRN</p>
              <p className="font-medium">{farmInfo.udlrn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Crop</p>
              <p className="font-medium">{farmInfo.crop}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Area</p>
              <p className="font-medium">{farmInfo.area} ha</p>
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

      {/* Satellite Image Thumbnail */}
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
          center={tiles?.center || { lat: 13.1234, lng: 77.5678 }}
          zoom={tiles?.zoom || 15}
          loading={!tiles}
        />
      </div>
    </div>
  );
}
