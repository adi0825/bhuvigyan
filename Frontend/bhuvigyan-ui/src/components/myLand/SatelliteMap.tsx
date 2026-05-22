import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, ImageOverlay } from 'react-leaflet';
import type { LandAnalyzeResponse } from '../../types/myLand.types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet icon path issue with Vite/webpack
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

interface Props {
  analysis: LandAnalyzeResponse | null;
  loading: boolean;
}

type MapLayer = 'satellite' | 'ndvi' | 'street';

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center[0], center[1]]);
  return null;
}

function generatePolygon(lat: number, lon: number): [number, number][] {
  const offset = 0.0009; // ~100m radius
  return [
    [lat + offset, lon - offset],
    [lat + offset, lon + offset],
    [lat, lon + offset * 1.2],
    [lat - offset, lon],
    [lat - offset * 0.8, lon - offset * 0.8],
  ];
}

function buildBounds(lat: number, lon: number): [[number, number], [number, number]] {
  const d = 0.001; // ~100m radius
  return [[lat - d, lon - d], [lat + d, lon + d]];
}

function ndviToColor(ndvi: number | null): string {
  if (ndvi === null) return '#6b7280';
  if (ndvi >= 0.6) return '#16a34a';   // healthy green
  if (ndvi >= 0.4) return '#84cc16';   // moderate lime
  if (ndvi >= 0.2) return '#f59e0b';   // amber — sparse/stressed
  if (ndvi >= 0.0) return '#ea580c';   // orange — very sparse
  return '#6b7280';                     // grey — water/shadow
}

function ndviLabel(ndvi: number | null, sceneAge?: number): string {
  if (ndvi === null) return 'No data';
  const age = sceneAge ?? 0;
  if (age > 45) {
    if (ndvi < 0.35) return `${ndvi.toFixed(2)} — Post-harvest (scene ${age}d old)`;
  }
  if (ndvi >= 0.6) return `${ndvi.toFixed(2)} — Healthy crop`;
  if (ndvi >= 0.4) return `${ndvi.toFixed(2)} — Moderate vegetation`;
  if (ndvi >= 0.2) return `${ndvi.toFixed(2)} — Sparse / stressed`;
  return `${ndvi.toFixed(2)} — Bare soil / fallow`;
}

export default function SatelliteMap({ analysis, loading }: Props) {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('satellite');

  const center: [number, number] = useMemo(() => {
    if (analysis?.coordinates) return [analysis.coordinates.lat, analysis.coordinates.lon];
    return [17.924381, 74.57982];
  }, [analysis?.coordinates?.lat, analysis?.coordinates?.lon]);

  const polygon = useMemo(() => generatePolygon(center[0], center[1]), [center[0], center[1]]);
  const bounds = useMemo(() => buildBounds(center[0], center[1]), [center[0], center[1]]);

  const ndvi = analysis?.satellite?.ndvi_mean ?? null;
  const ndviThumbnail = (analysis?.satellite as any)?.ndvi_tile_url ?? '';
  const rgbThumbnail = (analysis?.satellite as any)?.tile_url ?? '';
  const sceneDate = analysis?.satellite?.scene_date;
  const sceneAge = (analysis?.crop_analysis as any)?.scene_age_days ?? 0;

  // Tile layers
  const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const STREET_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  if (loading) {
    return (
      <div className="w-full h-[280px] md:h-[420px] bg-gray-100 animate-pulse rounded-xl border border-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500 font-medium">Loading satellite data...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[280px] md:h-[420px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer center={center} zoom={16} scrollWheelZoom={true} className="w-full h-full" zoomControl={false}>
        <MapController center={center} />

        {/* Base layer */}
        {activeLayer !== 'ndvi' && (
          <TileLayer
            attribution={activeLayer === 'satellite' ? '© Esri' : '© OpenStreetMap'}
            url={activeLayer === 'satellite' ? SATELLITE_TILES : STREET_TILES}
            maxZoom={19}
          />
        )}

        {/* NDVI layer: use GEE thumbnail if available, else color overlay */}
        {activeLayer === 'ndvi' && (
          <>
            <TileLayer attribution="© Esri" url={SATELLITE_TILES} maxZoom={19} opacity={0.4} />
            {ndviThumbnail ? (
              <ImageOverlay url={ndviThumbnail} bounds={bounds} opacity={0.85} />
            ) : (
              // Fallback: color the polygon based on NDVI value
              <Polygon
                positions={polygon}
                pathOptions={{ color: ndviToColor(ndvi), weight: 0, fillColor: ndviToColor(ndvi), fillOpacity: 0.75 }}
              />
            )}
          </>
        )}

        {/* Farm boundary polygon */}
        <Polygon
          positions={polygon}
          pathOptions={{ color: '#016B4B', weight: 2.5, fillColor: '#016B4B', fillOpacity: activeLayer === 'ndvi' ? 0 : 0.12 }}
        />

        {/* Center pin */}
        <Marker position={center}>
          <Popup>
            <div className="text-xs text-gray-800 space-y-0.5">
              <p className="font-bold">{analysis?.admin?.village || 'Farm Location'}</p>
              <p>{analysis?.admin?.district}, {analysis?.admin?.state}</p>
              <p>Lat: {center[0].toFixed(5)}, Lon: {center[1].toFixed(5)}</p>
              {ndvi !== null && <p>NDVI: {ndvi.toFixed(3)}</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Layer toggle buttons */}
      <div className="absolute top-3 left-3 flex gap-1.5 z-[1000]">
        {([
          { key: 'satellite', label: 'Satellite', icon: '🛰' },
          { key: 'ndvi',      label: 'NDVI',      icon: '🌿' },
          { key: 'street',    label: 'Map',        icon: '🗺' },
        ] as { key: MapLayer; label: string; icon: string }[]).map(l => (
          <button
            key={l.key}
            onClick={() => setActiveLayer(l.key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md transition-all shadow-lg border ${
              activeLayer === l.key
                ? 'bg-[#016B4B] text-white border-[#016B4B]'
                : 'bg-white/90 text-[#111827] border-gray-200 hover:bg-white'
            }`}
          >
            <span className="mr-1">{l.icon}</span>{l.label}
          </button>
        ))}
      </div>

      {/* Top-right info chips */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1.5">
        {sceneDate && (
          <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-white font-mono">
            Sentinel-2 · 10m · {sceneDate}
          </div>
        )}
        {ndvi !== null && (
          <div
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md"
            style={{ background: ndviToColor(ndvi) + 'cc', color: ndvi >= 0.4 ? '#0f2318' : '#fff' }}
          >
            NDVI {ndviLabel(ndvi, sceneAge)}
          </div>
        )}
      </div>

      {/* Bottom staleness warning */}
      {sceneAge > 45 && ndvi !== null && ndvi < 0.4 && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] px-3 py-2 rounded-lg bg-amber-900/80 backdrop-blur-md text-[10px] text-amber-200 flex items-start gap-1.5">
          <span className="text-amber-400 mt-0.5">⚠</span>
          <span>
            <strong>Scene is {sceneAge} days old.</strong> Rabi crops in Maharashtra are harvested Mar–Apr.
            Low NDVI ({ndvi.toFixed(2)}) is <strong>normal post-harvest stubble</strong> — not a fraud indicator.
          </span>
        </div>
      )}
    </div>
  );
}
