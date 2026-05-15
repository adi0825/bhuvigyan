import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { cscApi } from '../../api/cscApi';

const severityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function CscFraudAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cscApi.getFraudAlerts().then(res => {
      setAlerts(res.data.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load alerts');
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Fraud Alerts</h2>
      {alerts.length === 0 ? (
        <GovCard className="p-8 text-center text-gray-500">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          No fraud alerts for your claims.
        </GovCard>
      ) : (
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
                    </div>
                    <p className="text-sm text-gray-600">{a.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Alert ID: {a.alertId}</span>
                      <span>Claim: {a.claimId || 'N/A'}</span>
                      <span>Status: {a.status}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{a.triggeredAt ? new Date(a.triggeredAt).toLocaleDateString() : ''}</span>
                </div>
              </GovCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
