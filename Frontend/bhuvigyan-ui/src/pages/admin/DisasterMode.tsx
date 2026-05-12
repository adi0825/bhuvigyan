import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertOctagon,
  Wind,
  Droplets,
  CloudRain,
  Zap,
  CheckCircle,
  AlertTriangle,
  Activity,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DisasterMode() {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [eventName, setEventName] = useState('');
  const [disasterType, setDisasterType] = useState('FLOOD');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const districts = ['Bengaluru Rural', 'Belagavi', 'Dharwad', 'Gulbarga', 'Mysuru', 'Shimoga'];

  const handleActivate = () => {
    if (!eventName || selectedDistricts.length === 0) {
      toast.error('Please fill in all disaster event details');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setIsActive(true);
      setLoading(false);
      toast.success('Disaster Mode Activated. Triggering SAR Satellite Analysis...');
    }, 2000);
  };

  const handleDeactivate = () => {
    setIsActive(false);
    toast.success('Disaster Mode Terminated');
  };

  const toggleDistrict = (d: string) => {
    setSelectedDistricts(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold text-[#1a1a1a]">Disaster Management Protocol</h1>
          <p className="text-[#6b7280]">Emergency automated claim processing and satellite SAR monitoring</p>
        </div>
        {isActive && (
          <div className="px-4 py-2 bg-danger rounded-full text-white text-sm font-black flex items-center gap-2 animate-pulse shadow-lg shadow-danger/20">
            <Activity size={16} />
            DISASTER MODE ACTIVE
          </div>
        )}
      </div>

      {!isActive ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <GovCard topBorder="red" className="p-8">
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
                <AlertOctagon className="text-danger" />
                Declare Disaster Event
              </h3>

              <div className="space-y-6">
                <GovInput
                  label="Event Name"
                  placeholder="e.g. Karnataka Floods Nov 2026"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-[#1a1a1a]">Disaster Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'FLOOD', icon: Droplets, label: 'Flood' },
                        { id: 'DROUGHT', icon: Wind, label: 'Drought' },
                        { id: 'CYCLONE', icon: Zap, label: 'Cyclone' },
                        { id: 'HAILSTORM', icon: CloudRain, label: 'Hailstorm' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setDisasterType(type.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            disasterType === type.id
                              ? 'border-danger bg-[#fef2f2] text-danger font-bold'
                              : 'border-[#f3f4f6] bg-[#f9fafb] text-[#6b7280] hover:border-[#e5e7eb]'
                          }`}
                        >
                          <type.icon size={18} />
                          <span className="text-sm">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-[#1a1a1a]">Affected Districts</label>
                    <div className="p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl max-h-[160px] overflow-y-auto space-y-2">
                      {districts.map(d => (
                        <label key={d} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-danger"
                            checked={selectedDistricts.includes(d)}
                            onChange={() => toggleDistrict(d)}
                          />
                          <span className="text-sm text-[#374151] group-hover:text-danger transition-colors">{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#f3f4f6]">
                  <div className="p-4 bg-[#fff7ed] border border-[#ffedd5] rounded-xl flex gap-3 mb-6">
                    <AlertTriangle className="text-warning shrink-0" size={20} />
                    <p className="text-[13px] text-[#9a3412]">
                      <strong>Warning:</strong> Activating disaster mode will trigger automated SAR imagery processing and auto-approve matching claims in selected zones. This action is logged for central audit.
                    </p>
                  </div>
                  <GovButton
                    variant="primary"
                    fullWidth
                    className="bg-danger border-danger h-[52px] text-[16px]"
                    onClick={handleActivate}
                    loading={loading}
                  >
                    Execute Disaster Protocol
                  </GovButton>
                </div>
              </div>
            </GovCard>
          </div>

          <div className="space-y-6">
            <GovCard className="p-6 bg-gradient-to-br from-white to-[#fef2f2]">
              <h4 className="font-bold text-[#1a1a1a] mb-4">Automation Logic</h4>
              <ul className="space-y-4">
                {[
                  { title: 'SAR Imagery', desc: 'Sentinel-1 Radar pulls for cloud-penetrating loss detection.' },
                  { title: 'Auto-Approval', desc: 'Claims in affected districts matching NDVI damage profiles.' },
                  { title: 'Outlier Isolation', desc: 'Auto-flags claims from non-affected adjacent zones.' }
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0 font-bold text-xs">
                      {i+1}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1a1a1a]">{item.title}</p>
                      <p className="text-[12px] text-[#6b7280]">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </GovCard>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="grid lg:grid-cols-4 gap-6">
            {[
              { label: 'Bulk Processed', value: '1,247', unit: 'Claims', color: 'blue' },
              { label: 'Auto-Approved', value: '1,089', unit: 'Claims', color: 'green' },
              { label: 'Flagged Outliers', value: '158', unit: 'Suspect', color: 'red' },
              { label: 'Est. Payout', value: '₹24.3', unit: 'Cr', color: 'amber' },
            ].map((stat, i) => (
              <GovCard key={i} className="p-5" leftBorder={stat.color as any}>
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] font-black text-[#1a1a1a]">{stat.value}</span>
                  <span className="text-[13px] font-bold text-[#6b7280]">{stat.unit}</span>
                </div>
              </GovCard>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <GovCard topBorder="green" className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between">
                  <h3 className="font-bold text-[#1a1a1a]">Automated Processing Stream</h3>
                  <div className="flex items-center gap-2">
                    <span className="dot-pulse dot-green" />
                    <span className="text-[11px] font-bold text-success uppercase">Sentinel-1 Feed Live</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 bg-[#f9fafb] rounded-xl border border-[#f3f4f6] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center text-primary">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1a1a1a]">Batch #{1024 + i} Processed</p>
                            <p className="text-[12px] text-[#6b7280]">50 claims auto-approved in Belagavi District</p>
                          </div>
                        </div>
                        <StatusBadge status="APPROVED" />
                      </div>
                    ))}
                  </div>
                </div>
              </GovCard>
            </div>

            <div className="space-y-6">
              <GovCard className="p-6 bg-danger text-white border-none shadow-xl shadow-danger/20">
                <h4 className="font-bold text-[18px] mb-2 flex items-center gap-2">
                  <AlertOctagon size={20} />
                  Active Event
                </h4>
                <p className="text-[14px] text-white/80 mb-6">{eventName}</p>

                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Type</p>
                    <p className="font-bold">{disasterType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Zones</p>
                    <p className="font-bold">{selectedDistricts.join(', ')}</p>
                  </div>
                </div>

                <GovButton
                  variant="outline"
                  fullWidth
                  className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-danger"
                  onClick={handleDeactivate}
                >
                  Terminate Disaster Mode
                </GovButton>
              </GovCard>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}