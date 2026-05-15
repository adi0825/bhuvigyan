import type { AnalysisResult } from '../api/analysis'

interface Props {
  analysis: AnalysisResult
}

function Row({ label, value, highlight = false }: { label: string; value?: string | number | null; highlight?: boolean }) {
  const display = value === undefined || value === null || value === '' ? '—' : value
  const isEmpty = display === '—'
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold ${isEmpty ? 'text-gray-300' : highlight ? 'text-green-700' : 'text-gray-800'}`}>{display}</span>
    </div>
  )
}

export default function LandInfoPanel({ analysis }: Props) {
  const record = analysis.data?.land_record
  const admin = analysis.data?.admin
  const poly = analysis.data?.polygon

  if (!record && !admin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
        <div className="text-sm text-yellow-700 font-semibold">No land record available</div>
        <div className="text-xs text-yellow-600 mt-1">Bhoomi RTC data could not be retrieved for this parcel.</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span>📋</span>
        <span className="font-semibold text-sm text-gray-800">Land Record (Bhoomi)</span>
        {record?.source && (
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{record.source}</span>
        )}
      </div>

      <div className="space-y-0">
        <Row label="Owner Name" value={record?.owner_name} highlight />
        <Row label="All Owners" value={record?.all_owners?.join(', ')} />
        <Row label="Survey Number" value={record?.survey_number} highlight />
        <Row label="Hissa Number" value={record?.hissa_number} />
        <Row label="Recorded Area" value={record?.area_hectares !== undefined ? `${record.area_hectares.toFixed(4)} Ha` : undefined} highlight />
        <Row label="Area (Acres)" value={record?.area_acres !== undefined ? `${record.area_acres.toFixed(4)} acres` : undefined} />
        <Row label="Land Type" value={record?.land_type} />
        <Row label="Surnoc" value={record?.surnoc} />
        <Row label="RTC Period" value={record?.period} />
      </div>

      {admin && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Administrative Details</div>
          <div className="space-y-0">
            <Row label="District" value={admin.district} />
            <Row label="Taluk" value={admin.taluk} />
            <Row label="Hobli" value={admin.hobli} />
            <Row label="Village" value={admin.village} highlight />
            <Row label="Village Code" value={admin.village_code} />
            <Row label="KGIS Village ID" value={admin.kgis_village_id} />
          </div>
        </div>
      )}

      {poly && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parcel Geometry (KGIS)</div>
          <div className="space-y-0">
            <Row label="Polygon Found" value={poly.found ? '✅ Yes' : '❌ No'} />
            <Row label="Computed Area" value={poly.area_ha_computed !== undefined ? `${poly.area_ha_computed.toFixed(4)} Ha` : undefined} highlight />
            <Row label="Centroid" value={poly.centroid_lat !== undefined ? `${poly.centroid_lat.toFixed(5)}, ${poly.centroid_lng?.toFixed(5)}` : undefined} />
            <Row label="Polygons" value={poly.polygon_count} />
            <Row label="Geometry Valid" value={poly.valid ? '✅ Yes' : '⚠️ Issues'} />
          </div>
          {(poly.issues ?? []).length > 0 && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-orange-700 mb-1">Geometry Warnings</div>
              {poly.issues.map((issue, i) => (
                <div key={i} className="text-xs text-orange-600">• {issue}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 text-right">
        {analysis.cached && <span>⚡ Served from cache · </span>}
        <span>Source: {record?.source || 'unknown'} · Fetched {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
