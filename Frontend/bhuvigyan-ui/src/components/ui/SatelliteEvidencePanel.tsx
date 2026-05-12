import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite,
  Leaf,
  Map as MapIcon,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Navigation,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import GovButton from '../ui/GovButton';
import api from '../../api/axios';

interface SatelliteEvidencePanelProps {
  claimId: string;
  udlrn: string;
}

interface SatImage {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
  ndviValue?: number;
  damagedAreaPct?: number;
}

export default function SatelliteEvidencePanel({ claimId, udlrn }: SatelliteEvidencePanelProps) {
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState<SatImage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchEvidence = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get(`/admin/claims/${claimId}/satellite-evidence`);
        const data = res.data?.data || res.data;
        setEvidence(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (claimId) fetchEvidence();
  }, [claimId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="p-4 bg-red-50 rounded-xl text-red-700 text-sm text-center">
        Failed to load satellite evidence
      </div>
    );
  }

  const images: SatImage[] = [
    { id: 'trueColor', type: 'TRUE_COLOR', title: 'True Color (Sentinel-2)', description: evidence.images?.trueColor?.description || 'Visual of farm on claim date', url: evidence.images?.trueColor?.url || '/uploads/mock/true_color.jpg' },
    { id: 'ndviMap', type: 'NDVI', title: 'NDVI Vegetation Map', description: `${evidence.images?.ndviMap?.interpretation || ''} — NDVI: ${evidence.ndviAtClaim?.toFixed(3) || 'N/A'}`, url: evidence.images?.ndviMap?.url || '/uploads/mock/ndvi_map.jpg', ndviValue: evidence.ndviAtClaim },
    { id: 'lossMap', type: 'LOSS', title: 'Crop Loss Map', description: `Estimated ${evidence.images?.lossMap?.damagedAreaPct || 0}% crop damage detected`, url: evidence.images?.lossMap?.url || '/uploads/mock/loss_map.jpg', damagedAreaPct: evidence.images?.lossMap?.damagedAreaPct },
    { id: 'sar', type: 'SAR', title: 'SAR Radar (Sentinel-1)', description: evidence.images?.sar?.floodDetected ? 'Flood detected in area (blue = water)' : 'No flood detected — damage claim suspicious', url: evidence.images?.sar?.url || '/uploads/mock/sar_no_flood.jpg' },
  ];

  const nextImage = () => setActiveIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

  const riskColor = evidence.fraudRiskLevel === 'HIGH' ? 'red' : evidence.fraudRiskLevel === 'MEDIUM' ? 'amber' : 'green';
  const riskBg = evidence.fraudRiskLevel === 'HIGH' ? 'bg-red-50 border-red-300' : evidence.fraudRiskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300';
  const riskText = evidence.fraudRiskLevel === 'HIGH' ? 'text-red-700' : evidence.fraudRiskLevel === 'MEDIUM' ? 'text-amber-700' : 'text-green-700';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Satellite size={18} className="text-primary" />
          <h3 className="text-[15px] font-bold text-[#1a1a1a]">Satellite Fraud Evidence</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
            evidence.fraudRiskLevel === 'HIGH' ? 'bg-red-100 text-red-700'
            : evidence.fraudRiskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700'
          }`}>
            {evidence.fraudRiskLevel === 'HIGH' ? 'FRAUD LIKELY' : evidence.fraudRiskLevel === 'MEDIUM' ? 'VERIFY NEEDED' : 'GENUINE'}
          </span>
        </div>
      </div>

      <div className="relative group aspect-video bg-[#f3f4f6] rounded-2xl overflow-hidden border border-[#e5e7eb]">
        <AnimatePresence mode="wait">
          <motion.div
            key={images[activeIndex].id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0"
          >
            <img src={images[activeIndex].url} alt={images[activeIndex].title} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
              <h4 className="text-[14px] font-bold mb-0.5">{images[activeIndex].title}</h4>
              <p className="text-[12px] text-white/80">{images[activeIndex].description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/50 transition-all opacity-0 group-hover:opacity-100">
          <ChevronLeft size={20} />
        </button>
        <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/50 transition-all opacity-0 group-hover:opacity-100">
          <ChevronRight size={20} />
        </button>
        <button onClick={() => setZoomImage(images[activeIndex])} className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100">
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {images.map((img, i) => (
          <button key={img.id} onClick={() => setActiveIndex(i)} className={`relative rounded-lg overflow-hidden border-2 transition-all h-16 ${activeIndex === i ? 'border-primary shadow-md' : 'border-transparent opacity-60'}`}>
            <img src={img.url} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <div className={`p-3 rounded-xl border ${riskBg}`}>
        <div className="flex items-start gap-3">
          {evidence.fraudSignal ? <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${riskText}`} /> : <CheckCircle className={`w-5 h-5 flex-shrink-0 ${riskText}`} />}
          <div>
            <p className={`text-[13px] font-bold ${riskText}`}>{evidence.fraudSignal ? 'FRAUD SIGNAL DETECTED' : 'Evidence Consistent'}</p>
            <p className="text-[12px] text-[#6b7280] mt-1">{evidence.explanation}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-white/60 rounded p-2">
            <span className="text-[#9ca3af]">NDVI at Claim: </span>
            <span className="font-bold">{evidence.ndviAtClaim?.toFixed(3) || 'N/A'}</span>
          </div>
          <div className="bg-white/60 rounded p-2">
            <span className="text-[#9ca3af]">Flood (SAR): </span>
            <span className="font-bold">{evidence.sarFloodCheck?.floodDetected ? 'YES' : 'NO'}</span>
          </div>
        </div>
        <p className="text-[10px] text-[#9ca3af] mt-2">Source: ESA Sentinel-2/1 · {evidence.dataSource || 'DEV_MOCK'}</p>
      </div>

      <AnimatePresence>
        {zoomImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-8">
            <div className="flex justify-between items-center text-white mb-4">
              <div>
                <h2 className="text-xl font-bold">{zoomImage.title}</h2>
                <p className="text-sm text-white/60">{zoomImage.description}</p>
              </div>
              <button onClick={() => setZoomImage(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">✕</button>
            </div>
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/10">
              <img src={zoomImage.url} className="w-full h-full object-contain" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
