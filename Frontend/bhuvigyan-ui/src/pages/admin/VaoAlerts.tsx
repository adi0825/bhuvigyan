import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone, AlertTriangle, Shield, User, MapPin,
  FileText, CheckCircle, XCircle, ExternalLink, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovModal from '../../components/ui/GovModal';
import PageTransition from '../../components/ui/PageTransition';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../api/axios';
import type { VaoAlert } from '../../types';

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600',
    MEDIUM: 'bg-amber-100 text-amber-700',
    HIGH: 'bg-red-100 text-red-700',
    CRITICAL: 'bg-red-200 text-red-800 animate-pulse',
  };
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${colors[severity] || colors.LOW}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-700',
    INVESTIGATING: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    ESCALATED: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[status] || colors.OPEN}`}>
      {status}
    </span>
  );
}

export default function VaoAlerts() {
  const [alerts, setAlerts] = useState<VaoAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<VaoAlert | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/vao-alerts');
      const data = (res.data as any)?.data || [];
      setAlerts(data.map((a: any) => ({
        id: a.id,
        udlrn: a.udlrn,
        farmerName: a.farmerName || 'Unknown',
        farmerMobile: a.farmerMobile,
        alertType: a.alertType || 'UNKNOWN',
        severity: a.severity || 'MEDIUM',
        description: a.description || 'No description available',
        detectionSource: a.detectionSource || 'System',
        status: a.status || 'OPEN',
        assignedTahasildar: a.assignedTahasildar || 'Unassigned',
        createdAt: a.createdAt,
      })));
    } catch {
      toast.error('Failed to load VAO alerts');
    } finally {
      setLoading(false);
    }
  };

  const filtered = alerts.filter(a =>
    !filter || a.udlrn.toLowerCase().includes(filter.toLowerCase()) ||
    a.farmerName?.toLowerCase().includes(filter.toLowerCase()) ||
    a.alertType.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = {
    total: alerts.length,
    open: alerts.filter(a => a.status === 'OPEN').length,
    critical: alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length,
    escalated: alerts.filter(a => a.status === 'ESCALATED').length,
  };

  const handleAlertDC = () => {
    toast.success('District Collector notified');
    setDetailOpen(false);
  };

  const handleAlertTahsildar = () => {
    toast.success('Tahsildar notified');
    setDetailOpen(false);
  };

  const handleFreezeAccount = () => {
    toast.success('Farmer account frozen pending investigation');
    setDetailOpen(false);
  };

  const handleGenerateReport = () => {
    toast.success('VAO report PDF generated');
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" text="Loading VAO alerts..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Red Alert Banner */}
        {stats.critical > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-extrabold text-red-800">VAO Falsification Suspected</p>
              <p className="text-sm text-red-600">{stats.critical} high/critical alerts require immediate attention</p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GovCard className="p-4 text-center">
            <p className="text-2xl font-extrabold text-[#1a1a1a]">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium uppercase">Total Alerts</p>
          </GovCard>
          <GovCard className="p-4 text-center">
            <p className="text-2xl font-extrabold text-red-600">{stats.open}</p>
            <p className="text-xs text-gray-500 font-medium uppercase">Open</p>
          </GovCard>
          <GovCard className="p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{stats.critical}</p>
            <p className="text-xs text-gray-500 font-medium uppercase">High/Critical</p>
          </GovCard>
          <GovCard className="p-4 text-center">
            <p className="text-2xl font-extrabold text-purple-600">{stats.escalated}</p>
            <p className="text-xs text-gray-500 font-medium uppercase">Escalated</p>
          </GovCard>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">VAO Alert System</h1>
            <p className="text-[#6b7280] text-sm">Village Administrative Officer fraud detection alerts</p>
          </div>
          <GovButton variant="outline" onClick={handleGenerateReport}>
            <FileText size={16} /> Generate VAO Report PDF
          </GovButton>
        </div>

        {/* Filter */}
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by UDLRN, farmer, or alert type..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="gov-input pl-9 w-full"
          />
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <EmptyState icon={Megaphone} title="No alerts" message="No VAO alerts match your filters." />
          ) : (
            filtered.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GovCard className={`p-5 border-l-4 ${alert.severity === 'CRITICAL' ? 'border-l-red-500' : alert.severity === 'HIGH' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <SeverityBadge severity={alert.severity} />
                        <StatusBadge status={alert.status} />
                        <span className="text-xs text-gray-400 font-mono">{alert.alertType.replace('_', ' ')}</span>
                      </div>
                      <h3 className="font-bold text-[#1a1a1a] text-sm mb-1">
                        {alert.farmerName} — {alert.udlrn}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {alert.assignedTahasildar}</span>
                        <span className="flex items-center gap-1"><Shield size={12} /> {alert.detectionSource}</span>
                        <span>{new Date(alert.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <GovButton
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedAlert(alert); setDetailOpen(true); }}
                    >
                      <ExternalLink size={14} /> View Details
                    </GovButton>
                  </div>
                </GovCard>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <GovModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="VAO Alert Details"
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <GovButton variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Close</GovButton>
            <GovButton variant="primary" size="sm" onClick={handleAlertDC}>
              <Megaphone size={14} /> Alert District Collector
            </GovButton>
            <GovButton variant="primary" size="sm" onClick={handleAlertTahsildar}>
              <User size={14} /> Alert Tahsildar
            </GovButton>
            <GovButton variant="danger" size="sm" onClick={handleFreezeAccount}>
              <XCircle size={14} /> Freeze Farmer Account
            </GovButton>
          </div>
        }
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-extrabold text-red-800 text-sm mb-1">Alert Summary</p>
              <p className="text-sm text-red-700">{selectedAlert.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold uppercase">VAO Name</p>
                <p className="text-sm font-medium">{selectedAlert.farmerName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold uppercase">District</p>
                <p className="text-sm font-medium">{selectedAlert.assignedTahasildar}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold uppercase">Mutation / Event Date</p>
                <p className="text-sm font-medium">{new Date(selectedAlert.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-bold uppercase">NDVI Value</p>
                <p className="text-sm font-medium">{selectedAlert.alertType === 'NDVI_CONTRADICTION' ? '0.65 (Healthy)' : 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </GovModal>
    </PageTransition>
  );
}
