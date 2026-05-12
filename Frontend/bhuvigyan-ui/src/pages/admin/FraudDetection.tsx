import { useState, useEffect } from 'react';
import { Search, Filter, Download, AlertTriangle, FileText, CheckCircle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import StatCard from '../../components/ui/StatCard';
import FraudScoreBar from '../../components/ui/FraudScoreBar';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import FraudHistogram from '../../components/charts/FraudHistogram';
import { adminApi } from '../../api/admin';
import type { Claim, FraudDistribution, FilterOptions } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import { formatDistanceToNow } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';

export default function FraudDetection() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [fraudDist, setFraudDist] = useState<FraudDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [claimsRes, distRes] = await Promise.all([
        adminApi.getClaims(filters),
        adminApi.getFraudDistribution(),
      ]);
      const payload = (claimsRes as any).data?.data;
      setClaims(Array.isArray(payload) ? payload : payload?.claims || []);
      setFraudDist(distRes.data?.data || distRes.data || []);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const claimsList = Array.isArray(claims) ? claims : [];
  const highRiskCount = claimsList.filter((c) => c.fraudScore > 60).length;
  const avgScore = claimsList.length > 0
    ? Math.round(claimsList.reduce((acc, c) => acc + c.fraudScore, 0) / claimsList.length)
    : 0;

  const handleExport = () => {
    const filtered = claimsList.filter((c) => {
      if (filters.scoreMin && c.fraudScore < filters.scoreMin) return false;
      if (filters.scoreMax && c.fraudScore > filters.scoreMax) return false;
      return true;
    });

    const csv = [
      ['Claim #', 'Farmer', 'District', 'Score', 'Risk', 'Status', 'Date'].join(','),
      ...filtered.map((c) => {
        const risk = c.fraudScore < 30 ? 'LOW' : c.fraudScore < 60 ? 'MEDIUM' : 'HIGH';
        return [c.claimNumber, c.farmerName, c.district, c.fraudScore, risk, c.status, c.createdAt].join(',');
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraud-detection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">Fraud Detection Analytics</h1>
          <p className="text-[#6b7280]">Advanced anomaly detection and risk scoring for PMFBY claims.</p>
        </div>

        <GovCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  className="gov-input pl-10"
                  placeholder="Search claims by ID or farmer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <GovButton variant="outline">
                <Filter size={16} />
                Filters
              </GovButton>
              <GovButton variant="outline" onClick={handleExport}>
                <Download size={16} />
                Export CSV
              </GovButton>
            </div>
          </div>
        </GovCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Total Claims"
            value={claimsList.length}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="High Risk (>60)"
            value={highRiskCount}
            icon={AlertTriangle}
            color="red"
            trend={{ value: 12, isUp: true, label: 'vs last month' }}
          />
          <StatCard
            label="Avg Fraud Score"
            value={avgScore}
            icon={Info}
            color={avgScore > 60 ? 'red' : avgScore > 30 ? 'amber' : 'green'}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <GovCard className="lg:col-span-2 p-6">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
              <AlertCircle size={18} className="text-primary" />
              Fraud Score Distribution
            </h3>
            {loading ? (
              <div className="h-64 skeleton rounded-2xl" />
            ) : fraudDist.length > 0 ? (
              <FraudHistogram data={fraudDist} height={250} />
            ) : (
              <EmptyState
                icon={Search}
                title="No Data Available"
                message="Fraud distribution data is not currently available for the selected filters."
              />
            )}
          </GovCard>

          <GovCard className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <h3 className="font-bold text-[#1a1a1a] mb-4">Risk Insights</h3>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-[#e2e8f0]">
                <p className="text-[11px] font-bold text-[#94a3b8] uppercase mb-1">Top Risk Factor</p>
                <p className="text-[14px] font-bold text-[#1a1a1a]">NDVI/RTC Mismatch</p>
                <p className="text-[12px] text-[#64748b] mt-1">42% of high-risk claims show vegetation mismatch.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-[#e2e8f0]">
                <p className="text-[11px] font-bold text-[#94a3b8] uppercase mb-1">District Focus</p>
                <p className="text-[14px] font-bold text-[#1a1a1a]">Raichur, Karnataka</p>
                <p className="text-[12px] text-[#64748b] mt-1">Highest density of suspicious claims this week.</p>
              </div>
              <GovButton variant="outline" fullWidth size="sm">
                View Full Audit Report
                <ChevronRight size={14} />
              </GovButton>
            </div>
          </GovCard>
        </div>

        <GovCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 bg-[#f9fafb] border-b border-[#f3f4f6] flex items-center justify-between">
             <h3 className="font-bold text-[#1a1a1a]">Fraud Analysis Queue</h3>
             <StatusBadge status="ACTIVE" pulse />
          </div>
          {loading ? (
            <SkeletonLoader variant="table" />
          ) : claims.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No Claims Found"
              message="No claims match your current filters"
              action={{
                label: "Clear Filters",
                onClick: () => setFilters({})
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Claim #</th>
                    <th>Farmer</th>
                    <th>District</th>
                    <th className="w-48">Score</th>
                    <th>Risk</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claimsList.map((claim) => (
                    <tr key={claim.id}>
                      <td className="font-mono font-bold text-primary">{claim.claimNumber}</td>
                      <td className="font-medium">{claim.farmerName || 'N/A'}</td>
                      <td className="text-[#64748b]">{claim.district || 'N/A'}</td>
                      <td>
                        <FraudScoreBar score={claim.fraudScore} />
                      </td>
                      <td>
                        <StatusBadge 
                          status={claim.fraudScore < 30 ? 'APPROVED' : claim.fraudScore < 60 ? 'PENDING' : 'REJECTED'} 
                        />
                      </td>
                      <td>
                        <GovButton variant="outline" size="sm">Details</GovButton>
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