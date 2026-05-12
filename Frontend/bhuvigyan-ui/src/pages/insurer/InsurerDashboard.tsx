import { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { insurerApi } from '../../api/insurer';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import FraudScoreBar from '../../components/ui/FraudScoreBar';
import EmptyState from '../../components/ui/EmptyState';
import PageTransition from '../../components/ui/PageTransition';
import type { Claim } from '../../types';

export default function InsurerDashboard() {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [claimsRes, statsRes] = await Promise.allSettled([
        insurerApi.getClaims(),
        insurerApi.getStats(),
      ]);

      if (claimsRes.status === 'fulfilled') {
        setClaims((claimsRes.value as any).data?.data || (claimsRes.value as any).data || []);
      }
      if (statsRes.status === 'fulfilled') {
        const s = (statsRes.value as any).data?.data || (statsRes.value as any).data;
        setStats(s);
      }
    } catch (e) {
      console.error('Failed to load insurer data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (claimId: string) => {
    try {
      await insurerApi.approveClaim(claimId);
      toast.success('Claim approved successfully');
      fetchData();
    } catch (e) {
      toast.error('Failed to approve claim');
    }
  };

  const handleReject = async (claimId: string, reason: string) => {
    try {
      await insurerApi.rejectClaim(claimId, reason);
      toast.success('Claim rejected');
      fetchData();
    } catch (e) {
      toast.error('Failed to reject claim');
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.claimNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">Insurer Dashboard</h1>
            <p className="text-[#6b7280]">
              National Insurance Company Ltd — Karnataka Portfolio
            </p>
          </div>
          <div className="flex gap-3">
            <GovButton variant="outline" size="sm" onClick={fetchData}>
              Refresh
            </GovButton>
            <GovButton variant="outline" size="sm">
              Export CSV
            </GovButton>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Claims" value={stats.totalClaims || 0} color="blue" icon={FileText} />
            <StatCard label="Approved" value={stats.approvedCount || 0} color="green" icon={CheckCircle} />
            <StatCard label="Pending" value={stats.pendingCount || 0} color="amber" icon={Eye} />
            <StatCard label="Total Amount" value={`₹${((stats.approvedAmount || 0) / 100000).toFixed(1)}L`} color="green" icon={TrendingUp} />
          </div>
        )}

        <GovCard className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by claim number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="gov-input"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <GovButton
                  key={f}
                  variant={filter === f ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f}
                </GovButton>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 w-full" />)}
            </div>
          ) : filteredClaims.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Claims Found"
              message="No claims match your current filter."
              action={{ label: 'Clear Filters', onClick: () => { setFilter('all'); setSearch(''); } }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Claim #</th>
                    <th>Farmer</th>
                    <th>UDLRN</th>
                    <th>Amount</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td className="font-mono text-[13px] text-primary font-bold">
                        {claim.claimNumber || claim.id.slice(0, 8)}
                      </td>
                      <td>{claim.farmerName || '-'}</td>
                      <td className="font-mono text-[12px]">{claim.udlrn}</td>
                      <td className="font-bold">₹{((claim as any).claimAmountRequested || 0).toLocaleString()}</td>
                      <td>
                        {claim.fraudScore != null ? (
                          <FraudScoreBar score={claim.fraudScore} showLabel />
                        ) : (
                          <span className="text-[#9ca3af] text-[12px]">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td className="text-[13px] text-[#6b7280]">
                        {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <GovButton variant="outline" size="sm">
                            <Eye size={14} />
                          </GovButton>
                          {claim.status === 'PENDING' && (
                            <>
                              <GovButton variant="primary" size="sm" onClick={() => handleApprove(claim.id)}>
                                <CheckCircle size={14} />
                              </GovButton>
                              <GovButton variant="danger" size="sm" onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) handleReject(claim.id, reason);
                              }}>
                                <XCircle size={14} />
                              </GovButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GovCard>
      </div>
    </PageTransition>
  );
}