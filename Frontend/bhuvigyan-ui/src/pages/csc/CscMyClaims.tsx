import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Search, Filter, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { cscApi } from '../../api/cscApi';

export default function CscMyClaims() {
  const nav = useNavigate();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchClaims() {
    setLoading(true);
    try {
      const res = await cscApi.getMyClaims({ status: statusFilter || undefined, search: search || undefined, page });
      setClaims(res.data.data.items);
      setTotal(res.data.data.total);
    } catch {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClaims(); }, [statusFilter, page]);

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">My Claims</h2>

      <div className="flex flex-wrap gap-3">
        <GovInput placeholder="Search UDLRM / Name / Claim ID" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <GovButton variant="outline" onClick={() => { setPage(1); fetchClaims(); }}><Search className="w-4 h-4" /></GovButton>
        <select className="rounded-lg border border-gray-300 p-2" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="AUTO_APPROVED">Auto Approved</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="FIELD_VISIT_REQUIRED">Field Visit</option>
          <option value="AUTO_REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : claims.length === 0 ? (
        <EmptyState icon={FileText} title="No claims found" message="You have not filed any claims yet." />
      ) : (
        <GovCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Claim ID</th>
                  <th className="px-4 py-3 text-left">Farmer</th>
                  <th className="px-4 py-3 text-left">UDLRM</th>
                  <th className="px-4 py-3 text-left">Crop</th>
                  <th className="px-4 py-3 text-left">Loss%</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Filed</th>
                  <th className="px-4 py-3 text-left">Fraud</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c, i) => (
                  <motion.tr key={c.claimId} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.claimId}</td>
                    <td className="px-4 py-3">{c.farmerName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.udlrm}</td>
                    <td className="px-4 py-3">{c.cropType}</td>
                    <td className="px-4 py-3">{c.declaredLoss}%</td>
                    <td className="px-4 py-3">{c.claimAmount ? `₹${c.claimAmount.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-xs">{c.filedAt ? new Date(c.filedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.fraudScore > 60 ? 'bg-red-100 text-red-700' : c.fraudScore > 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {c.fraudScore}/100
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => nav(`/csc/claim/${c.claimId}`)} className="text-blue-600 hover:underline text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <GovButton variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Prev</GovButton>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <GovButton variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next</GovButton>
            </div>
          )}
        </GovCard>
      )}
    </div>
  );
}
