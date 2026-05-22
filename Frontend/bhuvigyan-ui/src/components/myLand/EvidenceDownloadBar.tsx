import { useState } from 'react';
import { FileText, Eye, Download, X } from 'lucide-react';
import type { LandAnalyzeResponse } from '../../types/myLand.types';

interface Props {
  analysis: LandAnalyzeResponse | null;
}

export default function EvidenceDownloadBar({ analysis }: Props) {
  const [showModal, setShowModal] = useState(false);

  const handleDownload = () => {
    // Simple PDF generation via window.print or data URI
    const data = JSON.stringify(analysis, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bhuvigyan-evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="sticky bottom-0 bg-[#0f2318]/95 backdrop-blur-md border-t border-[#1a3a25] px-4 py-3 flex items-center justify-between z-50">
        <div>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-lime-400" />
            Evidence Report Ready
          </p>
          <p className="text-[10px] text-gray-400">Includes satellite images, NDVI chart, land record</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a3a25] border border-[#2d5a3d] text-white text-xs font-bold hover:border-lime-500/40 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Report
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lime-500 hover:bg-lime-400 text-[#0f2318] text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0f2318] border border-[#1a3a25] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Evidence Report Preview</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#1a3a25] rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="p-3 bg-[#1a3a25] rounded-lg border border-[#2d5a3d]">
                <p className="font-bold text-white mb-1">Location</p>
                <p>Village: {analysis?.admin?.village || 'N/A'}</p>
                <p>District: {analysis?.admin?.district || 'N/A'}</p>
                <p>Lat: {analysis?.coordinates?.lat}, Lon: {analysis?.coordinates?.lon}</p>
              </div>

              <div className="p-3 bg-[#1a3a25] rounded-lg border border-[#2d5a3d]">
                <p className="font-bold text-white mb-1">Satellite Summary</p>
                <p>Source: {analysis?.satellite?.source || 'N/A'}</p>
                <p>NDVI: {analysis?.satellite?.ndvi_mean?.toFixed(2) || 'N/A'}</p>
                <p>Scene Date: {analysis?.satellite?.scene_date || 'N/A'}</p>
              </div>

              <div className="p-3 bg-[#1a3a25] rounded-lg border border-[#2d5a3d]">
                <p className="font-bold text-white mb-1">Crop Analysis</p>
                <p>Season: {analysis?.crop_analysis?.detected_season}</p>
                <p>Status: {analysis?.crop_analysis?.vegetation_status}</p>
                <p>Fraud Risk: {analysis?.crop_analysis?.fraud_risk_baseline}</p>
              </div>

              <p className="text-[10px] text-gray-500">
                Generated on {new Date().toLocaleString()} | Source: {analysis?.satellite?.source || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
