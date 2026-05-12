import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import GovButton from '../../components/ui/GovButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { inspectorApi } from '../../api/inspector';
import { useAuth } from '../../auth/AuthContext';

const STATUS_FILTERS = ['All', 'assigned', 'acknowledged', 'in_progress', 'submitted', 'overdue'];

export default function InspectorVisits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVisits = async () => {
      if (!user?.userId) return;
      try {
        const status = statusFilter === 'All' ? undefined : statusFilter;
        const res = await inspectorApi.getVisits(user.userId, status);
        setVisits(res.data?.data || []);
      } catch (err) {
        console.error('Fetch visits error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVisits();
  }, [user?.userId, statusFilter]);

  const filtered = visits.filter((v: any) =>
    !search || v.claim_id?.includes(search) || v.trigger_reason?.toLowerCase().includes(search.toLowerCase())
  );

  const getAction = (visit: any) => {
    switch (visit.status) {
      case 'assigned':
        return <GovButton size="sm" onClick={() => navigate(`/inspector/visits/${visit.id}`)}>Acknowledge</GovButton>;
      case 'acknowledged':
        return <GovButton size="sm" onClick={() => navigate(`/inspector/visits/${visit.id}`)}>Start Visit</GovButton>;
      case 'in_progress':
        return <GovButton size="sm" variant="primary" onClick={() => navigate(`/inspector/visits/${visit.id}/report`)}>Submit Report</GovButton>;
      case 'submitted':
        return <GovButton size="sm" variant="outline" onClick={() => navigate(`/inspector/visits/${visit.id}`)}>View Report</GovButton>;
      default:
        return null;
    }
  };

  const triggerTag: Record<string, string> = {
    fraud_score_61_80: '🤖 Fraud Score 61–80',
    ndvi_mismatch: '🛰️ NDVI Mismatch',
    geo_cluster: '📍 Geo-Cluster',
    high_amount: '💰 High Amount',
    repeat_claimant: '🔁 Repeat Claimant',
    manual: '👤 Manual (Admin)',
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">My Visits</h1>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'All' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search claim or trigger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading visits...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">No visits found</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Claim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fraud Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Trigger</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((visit: any) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{visit.claim_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{visit.visit_type}</td>
                    <td className="px-4 py-3 font-semibold">{visit.fraud_score_at_assignment || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                        {triggerTag[visit.trigger_reason] || visit.trigger_reason}
                      </span>
                    </td>
                    <td className="px-4 py-3">{visit.due_date}</td>
                    <td className="px-4 py-3"><StatusBadge status={visit.status} /></td>
                    <td className="px-4 py-3">{getAction(visit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
