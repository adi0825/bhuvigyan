import type { PolygonData, NDVIData } from '../api/land'

interface Props {
  polygon: PolygonData
  ndvi?: NDVIData
}

function InfoRow({
  label, value, highlight = false
}: {
  label: string
  value: string | number | undefined
  highlight?: boolean
}) {
  if (value === undefined || value === null) return null
  return (
    <div className="flex items-center justify-between
      py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">
        {label}
      </span>
      <span className={`text-xs font-semibold
        ${highlight ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}

export default function LandInfoCard(
  { polygon, ndvi }: Props
) {
  if (!polygon.found) return null

  return (
    <div className="bg-white rounded-2xl border
      border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span>📋</span>
        <span className="font-semibold text-sm
          text-gray-800">
          Parcel Information
        </span>
        {polygon.validation?.valid === false && (
          <span className="text-xs bg-red-100
            text-red-600 px-2 py-0.5 rounded-full ml-auto">
            ⚠️ Geometry issues
          </span>
        )}
      </div>

      <div className="space-y-0">
        <InfoRow
          label="Survey Number"
          value={polygon.survey_number}
          highlight
        />
        <InfoRow
          label="KGIS Village ID"
          value={polygon.kgis_village_id}
        />
        <InfoRow
          label="Area (Hectares)"
          value={
            polygon.area_ha !== undefined
              ? `${polygon.area_ha.toFixed(4)} Ha`
              : undefined
          }
          highlight
        />
        <InfoRow
          label="Area (Acres)"
          value={
            polygon.area_acres !== undefined
              ? `${polygon.area_acres.toFixed(4)} acres`
              : undefined
          }
        />
        <InfoRow
          label="Parcels"
          value={polygon.parcel_count}
        />
        <InfoRow
          label="Centroid"
          value={
            polygon.centroid_lat !== undefined
              ? `${polygon.centroid_lat.toFixed(5)}, ` +
                `${polygon.centroid_lng?.toFixed(5)}`
              : undefined
          }
        />
        <InfoRow
          label="In Karnataka"
          value={
            polygon.validation?.in_karnataka
              ? '✅ Yes' : '❌ No'
          }
        />
        <InfoRow
          label="Geometry Valid"
          value={polygon.is_valid ? '✅ Yes' : '⚠️ Fixed'}
        />
        {ndvi?.imagery?.scan_date && (
          <InfoRow
            label="Satellite Date"
            value={ndvi.imagery.scan_date}
          />
        )}
        {ndvi?.imagery?.source && (
          <InfoRow
            label="Imagery Source"
            value={ndvi.imagery.source}
          />
        )}
      </div>

      {/* Geometry warnings */}
      {(polygon.validation?.issues ?? []).length > 0 && (
        <div className="mt-3 bg-red-50 border
          border-red-200 rounded-xl p-3">
          <div className="text-xs font-semibold
            text-red-700 mb-1">
            Geometry Warnings
          </div>
          {polygon.validation!.issues.map((issue, i) => (
            <div key={i}
              className="text-xs text-red-600">
              • {issue}
            </div>
          ))}
        </div>
      )}

      {/* Cache indicator */}
      {polygon.cached && (
        <div className="mt-3 text-xs text-gray-400
          text-right">
          ⚡ Served from cache
        </div>
      )}
    </div>
  )
}
