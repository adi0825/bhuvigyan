import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon } from 'react-leaflet';
import { Satellite, AlertTriangle } from 'lucide-react';
import GovCard from '../ui/GovCard';
import 'leaflet/dist/leaflet.css';

interface Props {
  rgbTileUrl?: string;
  ndviTileUrl?: string;
  center: { lat: number; lng: number };
  zoom?: number;
  loading?: boolean;
  farmName?: string;
  polygon?: number[][];
  polygonAreaHa?: number;
}

type LayerMode = 'rgb' | 'ndvi' | 'osm';

export default function FarmSatelliteMap({
  rgbTileUrl,
  ndviTileUrl,
  center,
  zoom = 15,
  loading,
  farmName = 'Farm',
  polygon,
  polygonAreaHa,
}: Props) {
  const [mode, setMode] = useState<LayerMode>('rgb');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [rgbTileUrl, ndviTileUrl]);

  if (loading) {
    return (
      <GovCard className="space-y-3">
        <div className="h-6 w-1/3 skeleton rounded" />
        <div className="h-80 skeleton rounded" />
      </GovCard>
    );
  }

  // Guard against undefined coordinates
  const lat = typeof center.lat === 'number' ? center.lat : null;
  const lng = typeof center.lng === 'number' ? center.lng : null;
  const hasCoords = lat !== null && lng !== null;

  const tileUrl =
    mode === 'rgb' && rgbTileUrl
      ? rgbTileUrl
      : mode === 'ndvi' && ndviTileUrl
      ? ndviTileUrl
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const isGee = mode !== 'osm';

  return (
    <GovCard className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">Farm Satellite Map</h3>
          <p className="text-xs text-[#6b7280]">
            {hasCoords ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Coordinates unavailable'}
            {typeof polygonAreaHa === 'number' && <span className="ml-2">• {polygonAreaHa.toFixed(2)} ha</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#f3f4f6] rounded-lg p-1">
          {(['rgb', 'ndvi', 'osm'] as LayerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mode === m ? 'bg-white text-[#1a6b3c] shadow-sm' : 'text-[#6b7280]'
              }`}
            >
              {m === 'rgb' ? 'RGB' : m === 'ndvi' ? 'NDVI' : 'OSM'}
            </button>
          ))}
        </div>
      </div>

      {!rgbTileUrl && !ndviTileUrl && !hasError && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-800 text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>GEE tiles unavailable. Showing OpenStreetMap fallback.</span>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-800 text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>Tile layer failed to load. Switch to OSM mode.</span>
        </div>
      )}

      {!hasCoords && (
        <div className="h-80 rounded-xl overflow-hidden border border-[#e5e7eb] flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Farm coordinates unavailable. Cannot display map.
        </div>
      )}
      {hasCoords && (
      <div className="h-80 rounded-xl overflow-hidden border border-[#e5e7eb]">
        <MapContainer
          center={[lat, lng]}
          zoom={zoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          {mode === 'osm' && (
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          {isGee && (
            <TileLayer
              attribution="Sentinel-2 SR Harmonized · Google Earth Engine"
              url={tileUrl}
              eventHandlers={{
                tileerror: () => setHasError(true),
              }}
            />
          )}
          {!isGee && rgbTileUrl && mode === 'osm' && (
            <TileLayer
              attribution="Sentinel-2 SR Harmonized · Google Earth Engine"
              url={rgbTileUrl}
              opacity={0.4}
            />
          )}
          {polygon && polygon.length > 0 && (
            <Polygon
              positions={polygon}
              pathOptions={{
                color: '#1a6b3c',
                fillColor: '#1a6b3c',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          )}
          <Circle
            center={[lat, lng]}
            radius={500}
            pathOptions={{ color: '#1a6b3c', fillColor: '#1a6b3c', fillOpacity: 0.08, weight: 1 }}
          />
          <Marker position={[lat, lng]}>
            <Popup>
              <div className="text-sm font-semibold">{farmName}</div>
              <div className="text-xs text-[#6b7280]">
                Lat: {lat.toFixed(5)}<br />
                Lng: {lng.toFixed(5)}<br />
                {typeof polygonAreaHa === 'number' && <>Area: {polygonAreaHa.toFixed(2)} ha</>}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-[#9ca3af]">
        <div className="flex items-center gap-1">
          <Satellite className="w-3 h-3" />
          <span>Sentinel-2 SR Harmonized · Google Earth Engine</span>
        </div>
        <span>10m resolution</span>
      </div>
    </GovCard>
  );
}
