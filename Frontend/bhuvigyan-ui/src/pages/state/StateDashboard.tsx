import { useState, useEffect } from 'react';
import {
  Map,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Eye,
  AlertOctagon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { stateApi } from '../../api/state';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import PageTransition from '../../components/ui/PageTransition';
import type { FirAlert, VaoAlert, DistrictHeatmapEntry } from '../../types';

export default function StateDashboard() {
  const [loading, setLoading] = useState(true);
  const [firAlerts, setFirAlerts] = useState<FirAlert[]>([]);
  const [vaoAlerts, setVaoAlerts] = useState<VaoAlert[]>([]);
  const [heatmap, setHeatmap] = useState<DistrictHeatmapEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'fir' | 'vao' | 'heatmap'>('fir');
  const [selectedFir, setSelectedFir] = useState<FirAlert | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [firRes, vaoRes, heatRes] = await Promise.allSettled([
        stateApi.getFirAlerts('KA'),
        stateApi.getVaoAlerts('KA'),
        stateApi.getDistrictHeatmap('KA'),
      ]);
      if (firRes.status === 'fulfilled') setFirAlerts((firRes.value as any).data?.data || (firRes.value as any).data || []);
      if (vaoRes.status === 'fulfilled') setVaoAlerts((vaoRes.value as any).data?.data || (vaoRes.value as any).data || []);
      if (heatRes.status === 'fulfilled') setHeatmap((heatRes.value as any).data?.data || (heatRes.value as any).data || []);
    } catch (e) { console.error('Failed to load state data', e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfirmFir = async (alertId: string, policeStation: string) => {
    try { await stateApi.confirmFir(alertId, { policeStation }); toast.success('FIR confirmed'); setSelectedFir(null); fetchData(); } catch { toast.error('Failed to confirm FIR'); }
  };

  const handleDismissFir = async (alertId: string, notes: string) => {
    try { await stateApi.dismissFir(alertId, notes); toast.success('FIR alert dismissed'); setSelectedFir(null); fetchData(); } catch { toast.error('Failed to dismiss FIR'); }
  };

  const handleAlertTahasildar = async (alertId: string) => {
    try { await stateApi.alertTahasildar(alertId); toast.success('Tahasildar notified'); fetchData(); } catch { toast.error('Failed to alert'); }
  };

  const getHeatmapColor = (rate: number) => {
    if (rate > 30) return '#dc2626';
    if (rate > 15) return '#d97706';
    if (rate > 5) return '#eab308';
    return '#16a34a';
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">District Collector Dashboard</h1>
            <p className="text-[#6b7280]">Karnataka — Bagalkot District</p>
          </div>
          <GovButton variant="outline" size="sm" onClick={fetchData}>Refresh</GovButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="FIR Alerts" value={firAlerts.length} color="red" icon={AlertOctagon} />
          <StatCard label="VAO Alerts" value={vaoAlerts.length} color="amber" icon={AlertTriangle} />
          <StatCard label="High Fraud Districts" value={heatmap.filter(h => h.fraudRate > 15).length} color="amber" icon={Map} />
          <StatCard label="Resolved Today" value={0} color="green" icon={CheckCircle} />
        </div>

        <div className="flex gap-2 border-b border-[#e5e7eb]">
          {[{ key: 'fir', label: 'FIR Alerts', count: firAlerts.length }, { key: 'vao', label: 'VAO Alerts', count: vaoAlerts.length }, { key: 'heatmap', label: 'District Heatmap', count: heatmap.length }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`gov-tab ${activeTab === tab.key ? 'active' : ''}`}>
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {activeTab === 'fir' && (
          <GovCard className="p-6">
            <div className="flex items-center gap-2 mb-4"><AlertOctagon size={20} className="text-danger" /><h2 className="text-[18px] font-bold">FIR Alerts</h2></div>
            {firAlerts.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No FIR Alerts" message="No pending FIR alerts in your district." />
            ) : (
              <div className="space-y-3">
                {firAlerts.map((alert) => (
                  <div key={alert.id} className="border border-[#fee2e2] rounded-lg p-4 bg-[#fef2f2]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[13px] font-bold text-danger">FIR-{alert.claimNumber}</span>
                          <StatusBadge status={alert.status} />
                        </div>
                        <p className="text-[13px] text-[#6b7280]">{alert.udlrn}</p>
                        <p className="text-[13px] text-[#6b7280]">Fraud Score: {alert.fraudScore} | Filed: {new Date(alert.filedAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div className="flex gap-2">
                        <GovButton variant="primary" size="sm" onClick={() => setSelectedFir(alert)}><Eye size={14} /></GovButton>
                        {alert.status === 'PENDING_CONFIRMATION' && (
                          <>
                            <GovButton variant="primary" size="sm" onClick={() => { const ps = prompt('Police Station:'); if (ps) handleConfirmFir(alert.id, ps); }}><CheckCircle size={14} /> Confirm</GovButton>
                            <GovButton variant="outline" size="sm" onClick={() => { const notes = prompt('Dismiss notes:'); if (notes) handleDismissFir(alert.id, notes); }}><XCircle size={14} /> Dismiss</GovButton>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GovCard>
        )}

        {activeTab === 'vao' && (
          <GovCard className="p-6">
            <div className="flex items-center gap-2 mb-4"><AlertTriangle size={20} className="text-warning" /><h2 className="text-[18px] font-bold">VAO Falsification Alerts</h2></div>
            {vaoAlerts.length === 0 ? (
              <EmptyState icon={Bell} title="No VAO Alerts" message="No falsification alerts detected." />
            ) : (
              <div className="space-y-3">
                {vaoAlerts.map((alert) => (
                  <div key={alert.id} className="border border-[#fef3c7] rounded-lg p-4 bg-[#fffbeb]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{alert.alertType.replace('_', ' ')}</span>
                          <StatusBadge status={alert.status} />
                        </div>
                        <p className="text-[13px] font-medium">{alert.description}</p>
                        <p className="text-[12px] text-[#9ca3af] mt-1">UDLRN: {alert.udlrn} | Source: {alert.detectionSource}</p>
                      </div>
                      <GovButton variant="primary" size="sm" onClick={() => handleAlertTahasildar(alert.id)}><Bell size={14} /> Alert Tahasildar</GovButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GovCard>
        )}

        {activeTab === 'heatmap' && (
          <GovCard className="p-6">
            <div className="flex items-center gap-2 mb-4"><Map size={20} className="text-primary" /><h2 className="text-[18px] font-bold">Fraud Heatmap — Karnataka Districts</h2></div>
            {heatmap.length === 0 ? (
              <EmptyState icon={Map} title="No Data" message="Fraud heatmap data not available." />
            ) : (
              <div className="overflow-x-auto">
                <table className="gov-table">
                  <thead><tr><th>District</th><th>Total Claims</th><th>Fraud Count</th><th>Fraud Rate</th><th>Top Fraud Type</th></tr></thead>
                  <tbody>
                    {heatmap.map((d) => (
                      <tr key={d.districtCode}>
                        <td className="font-bold">{d.districtName || d.districtCode}</td>
                        <td>{d.totalClaims}</td>
                        <td>{d.fraudCount}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-[#e5e7eb] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(d.fraudRate, 100)}%`, background: getHeatmapColor(d.fraudRate) }} /></div>
                            <span className="text-[12px] font-bold">{d.fraudRate}%</span>
                          </div>
                        </td>
                        <td className="text-[13px] text-[#6b7280]">{d.topFraudType || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GovCard>
        )}
      </div>
    </PageTransition>
  );
}