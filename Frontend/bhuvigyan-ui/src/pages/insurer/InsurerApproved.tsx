import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { insurerApi } from '../../api/insurerApi';

export default function InsurerApproved() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insurerApi.getClaimsQueue({ status: 'INSURER_APPROVED' }).then(res => {
      setClaims(res.data.data.items);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load claims');
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> Approved Claims</h2>
      {claims.length === 0 ? (
        <GovCard className="p-8 text-center text-gray-500">No approved claims yet.</GovCard>
      ) : (
        <GovCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600"><tr>
                <th className="px-3 py-3 text-left">Claim ID</th>
                <th className="px-3 py-3 text-left">Farmer</th>
                <th className="px-3 py-3 text-left">UDLRM</th>
                <th className="px-3 py-3 text-left">Amount</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr></thead>
              <tbody>
                {claims.map((c, i) => (
                  <motion.tr key={c.claimId} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono text-xs">{c.claimId}</td>
                    <td className="px-3 py-3">{c.farmerName}</td>
                    <td className="px-3 py-3 font-mono text-xs">{c.udlrm}</td>
                    <td className="px-3 py-3">₹{c.claimAmount?.toLocaleString()}</td>
                    <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GovCard>
      )}
    </div>
  );
}
