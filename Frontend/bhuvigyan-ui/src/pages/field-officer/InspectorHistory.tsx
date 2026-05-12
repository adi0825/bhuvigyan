import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, Clock, AlertTriangle, Search, Loader2 } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import EmptyState from '../../components/ui/EmptyState';
import { officerApi } from '../../api/officer';
import type { OfficerVisit } from '../../types';

export default function InspectorHistory() {
  const [visits, setVisits] = useState<OfficerVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    officerApi.getVisits()
      .then(r => {
        const list = (r.data as any)?.data || [];
        setVisits(list.filter((v: OfficerVisit) => v.status === 'COMPLETED' || v.status === 'CANCELLED'));
      })
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = visits.filter(v =>
    v.farmerName?.toLowerCase().includes(filter.toLowerCase()) ||
    v.claimNumber?.toLowerCase().includes(filter.toLowerCase()) ||
    v.village?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">History</h1>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search visits..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No completed visits"
          message="Your completed inspection history will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <GovCard key={v.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  v.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {v.status === 'COMPLETED' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a1a]">{v.claimNumber}</p>
                  <p className="text-sm text-[#6b7280]">{v.farmerName} · {v.village}</p>
                  <p className="text-xs text-[#9ca3af]">UDLRN: {v.udlrn}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  v.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {v.status}
                </span>
                <p className="text-xs text-[#9ca3af] mt-1">Due: {v.dueBy?.slice(0, 10)}</p>
              </div>
            </GovCard>
          ))}
        </div>
      )}
    </div>
  );
}
