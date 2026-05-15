import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { insurerApi } from '../../api/insurerApi';

export default function InsurerClaimsQueue() {
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
      const res = await insurerApi.getClaimsQueue({ status: statusFilter || undefined, search: search || undefined, page });
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

  const fraudBarColor = (score: number) =>
    score <= 30 ? 'bg-green-500' : score <= 60 ? 'bg-yellow-500' : score <= 80 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Claims Queue</h2>
      <div className="flex flex-wrap gap-3">
        <GovInput placeholder="Search Claim ID / UDLRM / Name" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <GovButton variant="outline" onClick={() => { setPage(1); fetchClaims(); }}><Search className="w-4 h-4" /></GovButton>
        <select className="rounded-lg border border-gray-300 p-2" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="AUTO_APPROVED">Auto Approved</option>
          <option value="FIELD_VISIT_REQUIRED">Field Visit</option>
          <option value="AUTO_REJECTED">Auto Rejected</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <GovCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600"><tr>
                <th className="px-3 py-3 text-left">Claim ID</th>
                <th className="px-3 py-3 text-left">Farmer</th>
                <th className="px-3 py-3 text-left">UDLRM</th>
                <th className="px-3 py-3 text-left">Crop</th>
                <th className="px-3 py-3 text-left">Loss%</th>
                <th className="px-3 py-3 text-left">Amount</th>
                <th className="px-3 py-3 text-left">CSC</th>
                <th className="px-3 py-3 text-left">Fraud</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Action</th>
              </tr></thead>
              <tbody>
                {claims.map((c, i) => (
                  <motion.tr key={c.claimId} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono text-xs">{c.claimId}</td>
                    <td className="px-3 py-3">{c.farmerName}</td>
                    <td className="px-3 py-3 font-mono text-xs">{c.udlrm}</td>
                    <td className="px-3 py-3">{c.cropType}</td>
                    <td className="px-3 py-3">{c.declaredLoss}%</td>
                    <td className="px-3 py-3">{c.claimAmount ? `₹${c.claimAmount.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-3 text-xs">{c.cscOperator}</td>
                    <td className="px-3 py-3">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${fraudBarColor(c.fraudScore)}`} style={{width:`${c.fraudScore}%`}} />
                      </div>
                      <span className="text-xs text-gray-500">{c.fraudScore}</span>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-3">
                      <button onClick={() => nav(`/insurer/claim/${c.claimId}`)} className="text-blue-600 hover:underline text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> Review</button>
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
