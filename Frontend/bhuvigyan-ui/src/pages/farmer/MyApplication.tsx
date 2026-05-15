import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle, Clock, AlertCircle,
  Sprout, MapPin, Banknote, ShieldCheck, ChevronRight, Satellite, AlertTriangle
} from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import api from '../../api/axios';

interface TimelineItem {
  title: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
  description: string;
}

function getRegData() {
  try { return JSON.parse(localStorage.getItem('farmerRegistration') || '{}'); } catch { return {}; }
}

const TIMELINE: TimelineItem[] = [
  { title: 'Application Submitted', date: '14 May 2026', status: 'completed', description: 'Your PMFBY application has been received.' },
  { title: 'Land Verification', date: '14 May 2026', status: 'completed', description: 'Satellite & land record verification passed.' },
  { title: 'Document Review', date: '15 May 2026', status: 'current', description: 'Documents under review by CSC operator.' },
  { title: 'Premium Payment', date: 'Pending', status: 'pending', description: 'Pay premium after document approval.' },
  { title: 'Policy Issued', date: 'Pending', status: 'pending', description: 'Insurance policy will be issued upon payment.' },
];

export default function MyApplication() {
  const [reg, setReg] = useState<any>({});
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    setReg(getRegData());
    api.get('/farmer/application/claims').then(res => {
      if (res.data?.data) setClaims(res.data.data);
    }).catch(() => {});
  }, []);

  if (!reg || !reg.udlrm) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-[#1a1a1a] mb-6">My Application</h1>
        <GovCard className="p-8 text-center">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-[#6b7280] font-medium">No application found.</p>
          <p className="text-sm text-[#9ca3af]">Please complete registration to view your application.</p>
        </GovCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#1a1a1a]">My Application</h1>

      {/* UDLRM Card */}
      <GovCard className="p-5 bg-[#f0fdf4] border border-green-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-[#6b7280] uppercase tracking-wider font-bold">Farm UDLRM Number</p>
            <p className="text-2xl font-black text-[#1a6b3c] font-mono tracking-wider mt-1">{reg.udlrmNumber || reg.udlrm}</p>
          </div>
          <div className="flex items-center gap-2">
            {reg.landData?.coordinatesVerified ? (
              <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold">
                <Satellite className="w-3.5 h-3.5" /> Satellite Verified
              </div>
            ) : null}
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-bold">
              <Clock className="w-3.5 h-3.5" /> In Review
            </div>
          </div>
        </div>
      </GovCard>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GovCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-[#1a6b3c]" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Crop</p>
            <p className="text-sm font-bold text-[#1a1a1a]">{reg.landData?.landUseClassification || '—'}</p>
          </div>
        </GovCard>
        <GovCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Land Area</p>
            <p className="text-sm font-bold text-[#1a1a1a]">
              {reg.landData?.landAreaHa
                ? `${(parseFloat(reg.landData.landAreaHa) * 2.47105).toFixed(2)} ac`
                : '— ac'}
            </p>
            <p className="text-[10px] text-[#9ca3af]">
              {reg.landData?.landAreaHa ? `${reg.landData.landAreaHa} ha` : ''}
            </p>
          </div>
        </GovCard>
        <GovCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-[#6b7280]">Bank</p>
            <p className="text-sm font-bold text-[#1a1a1a] truncate">{reg.bank?.bankName || '—'}</p>
          </div>
        </GovCard>
      </div>

      {/* Timeline */}
      <GovCard className="p-5">
        <h3 className="text-sm font-bold text-[#1a1a1a] mb-5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1a6b3c]" /> Application Status Timeline
        </h3>
        <div className="relative">
          {TIMELINE.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 pb-6 last:pb-0"
            >
              {/* Line + Icon */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  item.status === 'completed' ? 'bg-green-600 text-white' :
                  item.status === 'current' ? 'bg-amber-500 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {item.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                   item.status === 'current' ? <Clock className="w-4 h-4" /> :
                   <AlertCircle className="w-4 h-4" />}
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-2 ${item.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'}`} />
                )}
              </div>
              {/* Content */}
              <div className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-sm font-bold ${
                    item.status === 'completed' ? 'text-green-800' :
                    item.status === 'current' ? 'text-amber-800' :
                    'text-gray-400'
                  }`}>{item.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'completed' ? 'bg-green-100 text-green-700' :
                    item.status === 'current' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {item.status === 'completed' ? 'Done' : item.status === 'current' ? 'In Progress' : 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-[#6b7280] mt-0.5">{item.date}</p>
                <p className="text-xs text-[#9ca3af] mt-1">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GovCard>

      {/* Claim Status Cards */}
      {claims.length > 0 && (
        <GovCard className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Claim Submissions
          </h3>
          {claims.map((c: any, i: number) => (
            <motion.div key={c.claimId} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:i*0.1}} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Claim {c.claimId}</p>
                  <p className="text-xs text-gray-500">{c.cropType} · {c.causeOfLoss} · Filed {c.filedAt ? new Date(c.filedAt).toLocaleDateString() : '—'}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    c.status === 'AUTO_APPROVED' ? 'bg-green-100 text-green-700' :
                    c.status === 'INSURER_APPROVED' ? 'bg-green-100 text-green-700' :
                    c.status === 'AUTO_REJECTED' ? 'bg-red-100 text-red-700' :
                    c.status === 'INSURER_REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{c.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-gray-500">Amount: ₹{c.claimAmount?.toLocaleString() || '—'}</span>
                <span className="text-gray-500">Fraud Score: {c.fraudScore}/100</span>
                <span className="text-gray-500">Verdict: {c.verdict?.replace(/_/g, ' ') || '—'}</span>
              </div>
            </motion.div>
          ))}
        </GovCard>
      )}
    </div>
  );
}
