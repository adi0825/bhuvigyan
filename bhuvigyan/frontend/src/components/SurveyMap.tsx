import { useEffect, useState } from 'react'
import {
  MapContainer, TileLayer, Polygon,
  CircleMarker, Popup, useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

interface Props {
  geojson?: any
  centroid?: [number, number]
  areaHa?: number
}

function MapUpdater({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => [c[0], c[1]]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [coords, map])
  return null
}

export default function SurveyMap({ geojson, centroid, areaHa }: Props) {
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'ndvi' | 'rgb'>('satellite')

  const center: [number, number] = centroid ?? [15.3, 75.7]

  // Extract coordinates from GeoJSON
  const rings: [number, number][][] = []
  if (geojson?.geometry?.coordinates) {
    const coords = geojson.geometry.coordinates
    if (Array.isArray(coords[0][0])) {
      rings.push(...coords.map((ring: number[][]) => ring.map((pt: number[]) => [pt[1], pt[0]] as [number, number])))
    }
  } else if (geojson?.coordinates) {
    const coords = geojson.coordinates
    if (Array.isArray(coords[0][0])) {
      rings.push(...coords.map((ring: number[][]) => ring.map((pt: number[]) => [pt[1], pt[0]] as [number, number])))
    }
  }

  const allCoords = rings.flat()
  const hasPolygon = rings.length > 0 && allCoords.length >= 3

  const colors = ['#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed']

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span>🗺</span>
          <span className="font-semibold text-sm text-gray-800">Survey Polygon Map</span>
          {hasPolygon && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ KGIS Verified</span>
          )}
        </div>
        <div className="flex gap-2">
          {[
            { id: 'satellite' as const, label: '🛰 Satellite' },
            { id: 'ndvi' as const, label: '🌿 NDVI' },
            { id: 'rgb' as const, label: '📷 True Color' }
          ].map(layer => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                ${activeLayer === layer.id ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ height: '420px' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          {activeLayer === 'satellite' && (
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="© Google Maps" maxZoom={20} />
          )}
          {(activeLayer === 'ndvi' || activeLayer === 'rgb') && (
            <>
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="© Google Maps" maxZoom={20} opacity={0.4} />
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="© Google Maps" maxZoom={20} />
            </>
          )}
          {activeLayer === 'satellite' && !hasPolygon && (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          )}

          {/* Polygons */}
          {hasPolygon && rings.map((coords, i) => (
            <Polygon
              key={i}
              positions={coords.map(c => ({ lat: c[0], lng: c[1] }))}
              pathOptions={{
                color: colors[i % colors.length],
                fillColor: colors[i % colors.length],
                fillOpacity: 0.15,
                weight: 2.5
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold mb-1">Parcel {i + 1}</div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Centroid marker */}
          {centroid && (
            <CircleMarker
              center={centroid}
              radius={6}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">Centroid</div>
                  <div>{centroid[0].toFixed(6)}, {centroid[1].toFixed(6)}</div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {hasPolygon && <MapUpdater coords={allCoords} />}
        </MapContainer>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
        <span><span className="text-green-600 font-semibold">■</span> Survey boundary</span>
        <span><span className="text-red-500 font-semibold">⊕</span> Centroid</span>
        {hasPolygon && areaHa !== undefined && (
          <span>Area: <b>{areaHa.toFixed(4)} Ha</b></span>
        )}
      </div>
    </div>
  )
}
