import { Wheat, Flower2, TreePine, Bean, Droplets, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { LandAnalyzeResponse } from '../../types/myLand.types';

interface Props {
  analysis: LandAnalyzeResponse | null;
  loading: boolean;
}

const cropIcons: Record<string, React.ReactNode> = {
  wheat: <Wheat className="w-5 h-5" />,
  cotton: <Flower2 className="w-5 h-5" />,
  sugarcane: <TreePine className="w-5 h-5" />,
  soybean: <Bean className="w-5 h-5" />,
  rice: <Droplets className="w-5 h-5" />,
};

function getCropIcon(name: string) {
  const key = Object.keys(cropIcons).find((k) => name.toLowerCase().includes(k));
  return key ? cropIcons[key] : <Wheat className="w-5 h-5" />;
}

export default function CropDetectionPanel({ analysis, loading }: Props) {
  const crop = analysis?.crop_analysis;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-48 shadow-sm" />
        <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-48 shadow-sm" />
      </div>
    );
  }

  const matchStatus = crop?.fraud_risk_baseline === 'LOW' ? 'match' :
    crop?.fraud_risk_baseline === 'MEDIUM' ? 'partial' : 'mismatch';

  const matchConfig = {
    match: { icon: <CheckCircle className="w-4 h-4" />, text: 'Satellite matches declared crop', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    partial: { icon: <AlertTriangle className="w-4 h-4" />, text: 'Partial match — review recommended', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    mismatch: { icon: <XCircle className="w-4 h-4" />, text: 'Mismatch detected', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  };

  const cfg = matchConfig[matchStatus];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Detected Crops */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#111827] mb-3">Detected Crops</h3>

        {crop?.vegetation_status && crop.vegetation_status !== 'Unknown — no satellite data' ? (
          <>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 mb-3">
              <div className="text-[#016B4B] mt-0.5">{getCropIcon(crop.estimated_crop_type || '')}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#111827]">
                  {crop.estimated_crop_type || 'Crop detected'}
                  {crop.crop_coverage_pct != null && <span className="ml-2 text-xs font-normal text-gray-500">({crop.crop_coverage_pct}% coverage)</span>}
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 mb-1">
                    <span>Confidence</span>
                    <span>{crop.crop_confidence}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#016B4B] rounded-full"
                      style={{ width: crop.crop_confidence === 'HIGH' ? '85%' : crop.crop_confidence === 'MEDIUM' ? '60%' : '30%' }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-semibold text-gray-600">
                    {crop.detected_season}
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-semibold text-gray-600">
                    {crop.irrigation_status}
                  </span>
                </div>
              </div>
            </div>

            {crop.mixed_crop_flag && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 mb-3">
                ⚠ Mixed farming detected — 2+ crops identified in this field
              </div>
            )}
            {crop.crop_confidence === 'LOW' && (
              <div className="p-2.5 bg-gray-500/10 border border-gray-500/30 rounded-lg text-xs text-gray-300">
                ℹ Crop type uncertain — cloud cover may have affected last satellite pass
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-gray-400 py-4 text-center">
            No satellite crop data available. Run analysis to detect crops.
          </div>
        )}
      </div>

      {/* Land Record */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#111827] mb-3">Land Record (Bhoomi / Official)</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Declared Crop</span>
            <span className="text-[#111827] font-bold">{analysis?.admin?.village ? 'As per RTC' : '—'}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Land Use Type</span>
            <span className="text-[#111827] font-bold">Agricultural</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Survey Area</span>
            <span className="text-[#111827] font-bold">—</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Village</span>
            <span className="text-[#111827] font-bold">{analysis?.admin?.village || '—'}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Source</span>
            <span className="text-[#111827] font-bold">{analysis?.admin?.source || '—'}</span>
          </div>
        </div>

        <div className={`mt-3 p-2.5 rounded-lg border flex items-center gap-2 text-xs font-bold ${cfg.color}`}>
          {cfg.icon}
          {cfg.text}
        </div>
      </div>
    </div>
  );
}
