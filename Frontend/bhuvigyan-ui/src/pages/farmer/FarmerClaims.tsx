import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Filter, ChevronDown, ChevronUp, AlertTriangle, Eye } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { farmerApi } from '../../api/farmer';
import type { Claim } from '../../types';

const statusFilters = ['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
const seasonFilters = ['ALL', 'Rabi 2025-26', 'Kharif 2026'];

function statusColor(status: string) {
  switch (status) {
    case 'APPROVED': return 'bg-[#F0FAF5] text-[#16A34A]';
    case 'REJECTED': return 'bg-[#FEF2F2] text-[#EF4444]';
    case 'UNDER_REVIEW': return 'bg-[#EFF6FF] text-[#3B82F6]';
    default: return 'bg-[#FEF3C7] text-[#F59E0B]';
  }
}

export default function FarmerClaims() {
  const nav = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [seasonFilter, setSeasonFilter] = useState('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await farmerApi.getClaims();
        setClaims((res as any).data?.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = claims.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (seasonFilter !== 'ALL') return true; // TODO: filter by season when data has it
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="rect" height={48} />
        {[1,2,3].map(i => <SkeletonLoader key={i} variant="rect" height={64} />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-extrabold text-[#111827]">My Claims</h2>
        <GovButton variant="primary" size="sm" onClick={() => nav('/farmer/claims/new')}>
          <Plus size={16} className="mr-1" /> New Claim
        </GovButton>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
              statusFilter === s
                ? 'bg-[#016B4B] text-white border-[#016B4B]'
                : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#016B4B]'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <div className="flex-1" />
        <select
          value={seasonFilter}
          onChange={e => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[#E5E7EB] bg-white text-[#111827] outline-none focus:border-[#016B4B]"
        >
          {seasonFilters.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Claims Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No claims found" message="You haven't filed any claims matching these filters." action={{ label: 'File New Claim', onClick: () => nav('/farmer/claims/new') }} />
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <GovCard key={claim.id} className="p-0 overflow-hidden border border-[#E5E7EB]">
              <button
                onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#F0FAF5] rounded-lg flex items-center justify-center">
                    <FileText size={18} className="text-[#016B4B]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">{claim.claimNumber}</p>
                    <p className="text-[12px] text-[#6B7280]">{claim.crop || '—'} · {new Date(claim.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColor(claim.status)}`}>
                    {claim.status.replace(/_/g, ' ')}
                  </span>
                  {expanded === claim.id ? <ChevronUp size={16} className="text-[#9CA3AF]" /> : <ChevronDown size={16} className="text-[#9CA3AF]" />}
                </div>
              </button>

              {expanded === claim.id && (
                <div className="px-4 pb-4 border-t border-[#F3F4F6]">
                  <div className="grid md:grid-cols-3 gap-4 pt-4 text-[12px]">
                    <div>
                      <p className="text-[#6B7280] mb-0.5">Fraud Score</p>
                      <p className="font-bold text-[#111827]">{claim.fraudScore}%</p>
                    </div>
                    <div>
                      <p className="text-[#6B7280] mb-0.5">UDLRN</p>
                      <p className="font-mono font-bold text-[#111827]">{claim.udlrn}</p>
                    </div>
                    <div>
                      <p className="text-[#6B7280] mb-0.5">District</p>
                      <p className="font-bold text-[#111827]">{claim.district || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <GovButton variant="outline" size="sm" onClick={() => nav(`/farmer/claims/${claim.id}`)}>
                      <Eye size={14} className="mr-1" /> View Details
                    </GovButton>
                  </div>
                </div>
              )}
            </GovCard>
          ))}
        </div>
      )}
    </div>
  );
}
