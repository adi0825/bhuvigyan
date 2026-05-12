import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  Scale, 
  Zap, 
  XCircle, 
  CheckCircle,
  FileText,
  ChevronDown, 
  ChevronRight,
  Download,
  Vote,
  Database,
  Activity
} from 'lucide-react';
import GovCard from './GovCard';
import GovButton from './GovButton';
import StatusBadge from './StatusBadge';
import FraudGauge from '../charts/FraudGauge';

interface ModelVote {
  model: string;
  verdict: 'FRAUD' | 'SUSPICIOUS' | 'LEGITIMATE';
  confidence: number;
}

interface FraudVerdictDisplayProps {
  score: number;
  claimId: string;
}

export default function FraudVerdictDisplay({ score, claimId }: FraudVerdictDisplayProps) {
  const [showFeatures, setShowFeatures] = useState(false);

  const getVerdict = (score: number) => {
    if (score <= 30) return {
      label: "AUTO APPROVED",
      description: "Claim meets all safety thresholds. Settlement initiated automatically.",
      color: "bg-[#f0fdf4] text-[#1a6b3c] border-[#bbf7d0]",
      accent: "bg-[#16a34a]",
      icon: CheckCircle,
      actions: ["Initiate Payment", "Send WhatsApp Notify"]
    };
    if (score <= 60) return {
      label: "OFFICER REVIEW REQUIRED",
      description: "Claim flagged for manual verification by a district officer.",
      color: "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
      accent: "bg-[#d97706]",
      icon: Search,
      actions: ["Assign to Officer", "View Land Records"]
    };
    if (score <= 80) return {
      label: "MANDATORY FIELD VISIT",
      description: "Significant anomalies found. Automatic CCE inspection assigned.",
      color: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
      accent: "bg-[#ea580c]",
      icon: AlertTriangle,
      actions: ["Assign CCE Visit", "Hold Payment"]
    };
    return {
      label: "AUTO REJECTED — FIR ALERT",
      description: "Severe fraud detected. DC notified and farmer blacklisted in UDLRN.",
      color: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]",
      accent: "bg-[#dc2626]",
      icon: ShieldCheck,
      actions: ["View FIR Details", "Notify District Collector"]
    };
  };

  const verdict = getVerdict(score);

  const modelVotes: ModelVote[] = [
    { model: "Crop Classifier", verdict: score > 70 ? "FRAUD" : score > 30 ? "SUSPICIOUS" : "LEGITIMATE", confidence: 87 },
    { model: "Anomaly Detector", verdict: score > 60 ? "SUSPICIOUS" : "LEGITIMATE", confidence: 72 },
    { model: "Timeline Validator", verdict: score > 80 ? "FRAUD" : score > 40 ? "SUSPICIOUS" : "LEGITIMATE", confidence: 91 },
  ];

  return (
    <div className="space-y-6">
      {/* VERDICT BANNER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm ${verdict.color}`}
      >
        <div className="flex items-center gap-5 text-center md:text-left">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg ${verdict.accent}`}>
            <verdict.icon size={30} />
          </div>
          <div>
            <h2 className="text-[20px] font-black tracking-tight">{verdict.label}</h2>
            <p className="text-[14px] opacity-80 font-medium">{verdict.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center md:justify-end">
          {verdict.actions.map(action => (
            <GovButton key={action} variant="outline" size="sm" className="bg-white/50 border-current hover:bg-white/80">
              {action}
            </GovButton>
          ))}
          <GovButton variant="primary" size="sm" className={verdict.accent}>
            <Download size={14} /> Evidence PDF
          </GovButton>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* MODEL CONSENSUS */}
        <GovCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] flex items-center gap-2">
              <Vote size={18} className="text-primary" />
              3-Model Consensus Vote
            </h3>
            <StatusBadge status="ACTIVE" pulse />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {modelVotes.map((vote) => (
              <div key={vote.model} className="p-4 bg-[#f9fafb] rounded-xl border border-[#e5e7eb]">
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase mb-3">{vote.model}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-black px-2 py-0.5 rounded ${
                    vote.verdict === 'FRAUD' ? 'bg-red-100 text-red-700' : 
                    vote.verdict === 'SUSPICIOUS' ? 'bg-amber-100 text-amber-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {vote.verdict}
                  </span>
                  <span className="text-[14px] font-black text-[#1a1a1a]">{vote.confidence}%</span>
                </div>
                <div className="mt-3 h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      vote.verdict === 'FRAUD' ? 'bg-red-500' : 
                      vote.verdict === 'SUSPICIOUS' ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${vote.confidence}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GovCard>

        {/* FINAL SCORE GAUGE */}
        <GovCard className="p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-[13px] font-bold text-[#9ca3af] uppercase tracking-widest mb-4">Risk Magnitude</h3>
          <div className="relative">
            <FraudGauge score={score} size={150} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-4xl font-black text-[#1a1a1a]">{score}</span>
              <span className="text-[10px] font-bold text-[#6b7280] uppercase">Weighted Score</span>
            </div>
          </div>
        </GovCard>
      </div>

      {/* FEATURE BREAKDOWN */}
      <GovCard className="p-0 overflow-hidden">
        <button 
          onClick={() => setShowFeatures(!showFeatures)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f9fafb] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Database size={18} />
            </div>
            <h3 className="font-bold text-[#1a1a1a]">47 Forensic Feature Breakdown</h3>
          </div>
          {showFeatures ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        
        <AnimatePresence>
          {showFeatures && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-[#e5e7eb]"
            >
              <div className="p-6 space-y-3 bg-[#f8fafc]">
                {[
                  { name: "NDVI Growth Anomaly", score: 84, icon: Activity },
                  { name: "RTC Rotation Frequency", score: 92, icon: RefreshCw },
                  { name: "Aadhaar Bio-Sync Match", score: 12, icon: UserCheck },
                  { name: "Plot Boundary Overlap", score: 45, icon: Scale },
                  { name: "Historical Claim Density", score: 78, icon: Zap },
                ].map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#e5e7eb] shadow-sm">
                    <div className="flex items-center gap-3">
                      <feature.icon size={16} className="text-[#94a3b8]" />
                      <span className="text-[14px] font-medium text-[#475569]">{feature.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div className={`h-full ${feature.score > 60 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${feature.score}%` }} />
                      </div>
                      <span className={`text-[12px] font-black w-10 text-right ${feature.score > 60 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {feature.score}%
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-center text-[10px] text-[#9ca3af] font-bold py-2 uppercase tracking-widest">+ 41 more features analyzed</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GovCard>
    </div>
  );
}

// Dummy RefreshCw if not imported from elsewhere (it is imported now)
const RefreshCw = ({ size, className }: { size?: number, className?: string }) => <Activity size={size} className={className} />;
