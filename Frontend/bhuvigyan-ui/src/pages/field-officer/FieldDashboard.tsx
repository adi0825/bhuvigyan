import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Map, Camera, Search, User, Navigation, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import PageTransition from '../../components/ui/PageTransition';
import { useAuth } from '../../auth/AuthContext';
import { officerApi } from '../../api/officer';
import type { OfficerVisit } from '../../types';

export default function FieldDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<OfficerVisit[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await officerApi.getVisits();
      const payload = (res.data as any)?.data;
      const visitsList = Array.isArray(payload) ? payload : payload?.visits || [];
      setVisits(visitsList);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to load visits');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setStats({
      total: visits.length,
      completed: visits.filter((v) => v.status === 'COMPLETED').length,
      pending: visits.filter((v) => v.status === 'ASSIGNED').length,
      overdue: 0,
    });
  }, [visits]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={14} className="text-[#16a34a]" />;
      case 'ASSIGNED': return <Clock size={14} className="text-[#d97706]" />;
      case 'IN_PROGRESS': return <Navigation size={14} className="text-[#0057a8]" />;
      default: return <AlertTriangle size={14} className="text-[#dc2626]" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-[#dc2626] bg-[#fee2e2]';
      case 'URGENT': return 'text-[#7c2d12] bg-[#fee2e2] animate-pulse';
      default: return 'text-[#065f46] bg-[#d1fae5]';
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">Field Inspection Portal</h1>
            <p className="text-[#6b7280]">
              Officer: <span className="font-bold text-primary">{user?.fullName || 'Ramesh Field Inspector'}</span> | Zone: <span className="font-bold">Bagalkot</span>
            </p>
          </div>
          <div className="flex gap-3">
            <GovButton variant="outline" size="sm" onClick={fetchData} loading={loading}>
              Sync Assignments
            </GovButton>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Visits" value={stats.total} color="blue" icon={ClipboardList} />
          <StatCard label="Completed" value={stats.completed} color="green" icon={CheckCircle} />
          <StatCard label="Pending" value={stats.pending} color="amber" icon={Clock} />
          <StatCard label="Overdue" value={stats.overdue} color="red" icon={AlertTriangle} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <GovCard className="p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f3f4f6] bg-[#f9fafb] flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#1a1a1a] flex items-center gap-2">
                  <ClipboardList className="text-primary" />
                  Assigned Field Checks (CCE)
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                  stats.pending > 0 ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#d1fae5] text-[#065f46]'
                }`}>
                  {stats.pending} Assigned
                </span>
              </div>
              <div className="divide-y divide-[#f3f4f6]">
                {visits.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="No Inspections Assigned" message="No CCE field inspections assigned to your account." action={{ label: 'Refresh', onClick: fetchData }} />
                ) : (
                  visits.map((visit) => (
                    <div key={visit.id} className="p-5 hover:bg-[#f0fdf4] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {getStatusIcon(visit.status)}
                            <span className="font-mono text-[13px] font-bold text-primary">{visit.claimNumber}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(visit.priority)}`}>
                              {visit.priority}
                            </span>
                            <StatusBadge status={visit.status} />
                          </div>
                          <p className="text-[14px] font-bold text-[#1a1a1a]">{visit.farmerName}</p>
                          <p className="text-[12px] text-[#6b7280] mt-0.5">UDLRN: {visit.udlrn} | {visit.village}</p>
                          <p className="text-[11px] text-[#9ca3af] mt-1">
                            Due: {new Date(visit.dueBy).toLocaleDateString('en-IN')} | Mobile: {visit.farmerMobile}
                          </p>
                          {visit.cceVerdict && (
                            <p className="text-[12px] font-bold text-[#16a34a] mt-1">
                              Verdict: {visit.cceVerdict}
                            </p>
                          )}
                        </div>
                        <GovButton
                          variant={visit.status === 'COMPLETED' ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => {
                            if (visit.status === 'COMPLETED') {
                              navigate(`/field/visit/${visit.id}`);
                            } else if (visit.status === 'IN_PROGRESS') {
                              navigate(`/field/inspect/${visit.id}`);
                            } else {
                              navigate(`/field/visit/${visit.id}`);
                            }
                          }}
                        >
                          {visit.status === 'COMPLETED' ? 'View Report' : visit.status === 'IN_PROGRESS' ? 'Continue' : 'Start Inspection'}
                        </GovButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GovCard>

            <GovCard className="p-6">
              <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Map size={18} className="text-[#0057a8]" />
                Field Assignment Map
              </h3>
              <div className="h-[250px] bg-[#f8fafc] rounded-2xl border-2 border-dashed border-[#e2e8f0] flex flex-col items-center justify-center text-center p-8">
                <Navigation size={32} className="text-[#94a3b8] mb-3" />
                <p className="text-[#64748b] font-medium">GPS Integration Active</p>
                <p className="text-[12px] text-[#94a3b8] max-w-xs mt-1">
                  {stats.pending} pending visit{stats.pending !== 1 ? 's' : ''} in your zone
                </p>
              </div>
            </GovCard>
          </div>

          <div className="space-y-6">
            <GovCard className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <h3 className="font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                Quick Verification
              </h3>
              <p className="text-[13px] text-[#6b7280] leading-relaxed mb-4">
                Capture geotagged photos of crop damage. Photos must be taken within plot boundary.
              </p>
              <GovButton variant="primary" fullWidth className="h-12" disabled={stats.pending === 0}>
                <Camera size={18} />
                Open Field Camera
              </GovButton>
            </GovCard>

            <GovCard className="p-6">
              <h3 className="font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Search size={18} className="text-[#1e40af]" />
                UDLRN Lookup
              </h3>
              <div className="space-y-3">
                <input type="text" placeholder="Search UDLRN..." className="gov-input" />
                <GovButton variant="outline" fullWidth size="sm">Search Record</GovButton>
              </div>
            </GovCard>

            <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-2xl">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 border border-[#fecaca]">
                  <User size={16} className="text-danger" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#b91c1c]">Compliance Warning</p>
                  <p className="text-[11px] text-[#b91c1c]/80 mt-0.5">
                    Falsifying field reports is a punishable offense under PMFBY Section 12.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}