import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { insurerApi } from '../../api/insurerApi';

const severityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function InsurerFraudAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insurerApi.getFraudAlerts(severityFilter || undefined).then(res => {
      setAlerts(res.data.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load alerts');
      setLoading(false);
    });
  }, [severityFilter]);

  async function escalate(alertId: string) {
    try {
      await insurerApi.escalateAlert({ alertId, notes: 'Escalated to DC for review' });
      toast.success('Alert escalated to DC');
      setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, status: 'ESCALATED' } : a));
    } catch {
      toast.error('Escalation failed');
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Fraud Alerts</h2>
      <div className="flex gap-2">
        {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s === 'All' ? '' : s.toUpperCase())}
            className={`px-3 py-1 rounded-lg text-sm ${severityFilter === (s === 'All' ? '' : s.toUpperCase()) ? 'bg-[#0d1b4b] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {alerts.map((a, i) => (
          <motion.div key={a.alertId} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:i*0.05}}>
            <GovCard className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${a.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'}`} />
                    <span className="font-bold text-sm">{a.type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[a.severity] || 'bg-gray-100'}`}>{a.severity}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-gray-600">{a.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>UDLRM: {a.udlrm}</span>
                    <span>Claim: {a.claimId || 'N/A'}</span>
                    <span>CSC: {a.cscOperator || 'N/A'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">{a.triggeredAt ? new Date(a.triggeredAt).toLocaleDateString() : ''}</span>
                  {a.severity === 'CRITICAL' && a.status !== 'ESCALATED' && (
                    <GovButton variant="danger" size="sm" className="mt-2" onClick={() => escalate(a.alertId)}><ArrowUpRight className="w-3 h-3" /> Escalate to DC</GovButton>
                  )}
                </div>
              </div>
            </GovCard>
          </motion.div>
        ))}
        {alerts.length === 0 && <GovCard className="p-8 text-center text-gray-500">No fraud alerts found.</GovCard>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'ESCALATED' ? 'bg-purple-100 text-purple-700' : status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status}</span>;
}
