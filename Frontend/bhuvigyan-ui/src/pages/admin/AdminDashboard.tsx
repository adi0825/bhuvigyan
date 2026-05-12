import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, AlertTriangle, RefreshCw,
  Search, Download, Shield, CheckCircle, Filter, MapPin, Satellite
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import StatCard from '../../components/ui/StatCard';
import ClaimsDonut from '../../components/charts/ClaimsDonut';
import FraudHistogram from '../../components/charts/FraudHistogram';
import FraudScoreBar from '../../components/ui/FraudScoreBar';
import StatusBadge from '../../components/ui/StatusBadge';
import GovModal from '../../components/ui/GovModal';
import SatelliteEvidencePanel from '../../components/ui/SatelliteEvidencePanel';
import FraudVerdictDisplay from '../../components/ui/FraudVerdictDisplay';
import { adminApi } from '../../api/admin';
import { satelliteApi } from '../../api/satellite';
import type { Claim, ClaimsByStatusCount, FraudDistribution } from '../../types';
import { formatDistanceToNow } from '../../utils/formatters';

export default function AdminDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [claimsByStatus, setClaimsByStatus] = useState<ClaimsByStatusCount>({
    PENDING: 0, APPROVED: 0, REJECTED: 0,
    UNDER_REVIEW: 0, OFFICER_REVIEW: 0, CCE_VISIT: 0,
  });
  const [fraudDist, setFraudDist] = useState<FraudDistribution[]>([]);
  const [highFraudClaims, setHighFraudClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [vaoAlerts, setVaoAlerts] = useState<any[]>([]);

  // UDLRN search states
  const [udlrnSearch, setUdlrnSearch] = useState('');
  const [satelliteModalOpen, setSatelliteModalOpen] = useState(false);
  const [satelliteData, setSatelliteData] = useState<any>(null);
  const [satelliteLoading, setSatelliteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, claimsRes, fraudRes, vaoRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getClaims({ min_fraud_score: 0, max_fraud_score: 100, sort_by: 'fraud_score', sort_order: 'desc', limit: 20 }),
        adminApi.getFraudDistribution(),
        adminApi.getVaoAlerts(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const data = (statsRes.value as any).data?.data || (statsRes.value as any).data;
        setStats(data);
        const breakdown = data?.claimsStatusBreakdown || {};
        setClaimsByStatus({
          PENDING: breakdown.PENDING || breakdown.AUTO_APPROVED ? 0 : 0,
          APPROVED: (breakdown.APPROVED || 0) + (breakdown.AUTO_APPROVED || 0),
          REJECTED: (breakdown.REJECTED || 0) + (breakdown.AUTO_REJECTED || 0),
          UNDER_REVIEW: breakdown.UNDER_REVIEW || 0,
          OFFICER_REVIEW: breakdown.OFFICER_REVIEW || 0,
          CCE_VISIT: breakdown.CCE_VISIT || 0,
        });
      }
      if (claimsRes.status === 'fulfilled') {
        const data = (claimsRes.value as any).data?.data?.claims || (claimsRes.value as any).data?.claims || [];
        setHighFraudClaims(data.slice(0, 10));
      }
      if (fraudRes.status === 'fulfilled') {
        const fd = (fraudRes.value as any).data?.data?.distribution || [];
        setFraudDist(fd.map((d: any) => ({ range: d.range, count: d.count, risk: (d.label.replace(' Risk', '').toUpperCase()) as any })));
      }
      if (vaoRes.status === 'fulfilled') {
        const alerts = (vaoRes.value as any).data?.data || [];
        setVaoAlerts(alerts.filter((a: any) => a.severity === 'CRITICAL' || a.severity === 'HIGH').slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateClaim = async (id: string, action: string) => {
    try {
      if (action === 'APPROVED') {
        await adminApi.approveClaim(id);
        toast.success('Claim approved');
      } else if (action === 'REJECTED') {
        await adminApi.rejectClaim(id, 'Rejected by admin');
        toast.success('Claim rejected');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to update claim');
    }
  };

  const handleUdlrnSearch = async () => {
    if (!udlrnSearch.trim()) {
      toast.error('Please enter a UDLRN number');
      return;
    }
    setSatelliteLoading(true);
    try {
      const res = await satelliteApi.getFarmByUdlrn(udlrnSearch.trim());
      setSatelliteData(res.data.data);
      setSatelliteModalOpen(true);
      toast.success('Farm data loaded');
    } catch (error) {
      toast.error('Farm not found or satellite data unavailable');
    } finally {
      setSatelliteLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <AnimatePresence>
        {vaoAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-[#fef2f2] border-2 border-danger rounded-xl flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-danger text-white rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-danger uppercase tracking-tight">⚠ VAO FALSIFICATION SUSPECTED</h3>
                <p className="text-[13px] text-[#b91c1c] font-medium">
                  {vaoAlerts[0]?.farmerName ? `Farmer: ${vaoAlerts[0].farmerName} | ` : ''}
                  UDLRN: <strong>{vaoAlerts[0]?.udlrn || '—'}</strong> | Severity: <strong>{vaoAlerts[0]?.severity || '—'}</strong>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <GovButton variant="outline" size="sm" className="bg-white border-danger text-danger hover:bg-[#fee2e2]" onClick={() => nav('/admin/vao-alerts')}>View All Alerts</GovButton>
              <GovButton variant="primary" size="sm" className="bg-danger border-danger" onClick={() => handleUpdateClaim(vaoAlerts[0]?.id, 'REJECTED')}>Flag for Review</GovButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold text-[#1a1a1a]">Executive Dashboard</h1>
          <p className="text-[14px] text-[#6b7280]">Real-time monitoring of crop insurance and carbon programs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search UDLRN..."
              value={udlrnSearch}
              onChange={(e) => setUdlrnSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUdlrnSearch()}
              className="h-8 pl-9 pr-4 bg-white border border-[#d1d5db] rounded-md text-[12px] focus:border-primary outline-none w-48"
            />
          </div>
          <GovButton variant="outline" size="sm" onClick={handleUdlrnSearch} loading={satelliteLoading}>
            <Satellite size={14} />
            Farm Data
          </GovButton>
          <GovButton variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </GovButton>
          <GovButton variant="primary" size="sm">
            <Download size={14} />
            Export Data
          </GovButton>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Farmers" value={stats?.totalFarmers || 0} icon={Users} color="blue" loading={loading && !stats} />
        <StatCard label="Fraud Alerts" value={stats?.fraudAlerts || 0} icon={AlertTriangle} color="red" trend={{ value: 5, isUp: true, label: 'score > 60' }} loading={loading && !stats} />
        <StatCard label="Auto Approved" value={stats?.autoApproved || 0} icon={CheckCircle} color="green" loading={loading && !stats} />
        <StatCard label="Pending CCE" value={stats?.pendingVisits || 0} icon={FileText} color="amber" loading={loading && !stats} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GovCard topBorder="green" className="p-6">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Claims Processing Status
          </h3>
          <div className="flex items-center justify-center min-h-[250px]">
            <ClaimsDonut data={claimsByStatus} size={250} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {Object.entries(claimsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-2 bg-[#f9fafb] rounded-lg border border-[#f3f4f6]">
                <StatusBadge status={status as any} />
                <span className="font-black text-[#1a1a1a]">{count}</span>
              </div>
            ))}
          </div>
        </GovCard>

        <GovCard topBorder="red" className="p-6">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger" />
            Fraud Score Distribution
          </h3>
          <div className="min-h-[250px] flex items-center justify-center">
            {fraudDist.length > 0 ? (
              <FraudHistogram data={fraudDist} height={250} />
            ) : (
              <div className="text-[#9ca3af] text-sm">Waiting for risk data...</div>
            )}
          </div>
        </GovCard>
      </div>

      <GovCard topBorder="orange" className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1a1a1a] flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning" />
            Recent High Risk Claims
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search UDLRN..."
                className="h-8 pl-9 pr-4 bg-white border border-[#d1d5db] rounded-md text-[12px] focus:border-primary outline-none"
              />
            </div>
            <GovButton variant="outline" size="sm" className="h-8 px-3">
              <Filter size={14} />
            </GovButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          {highFraudClaims.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-[#1a6b3c]" />
              </div>
              <p className="text-[#6b7280] font-medium">No high-risk claims found at the moment.</p>
            </div>
          ) : (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Farmer Details</th>
                  <th>UDLRN</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {highFraudClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="font-mono font-bold text-primary">{claim.claimNumber}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold">{claim.farmerName || 'Unknown'}</span>
                        <span className="text-[11px] text-[#9ca3af]">{(claim as any).farmerMobile || '-'}</span>
                      </div>
                    </td>
                    <td className="font-mono text-[12px]">{claim.udlrn}</td>
                    <td><FraudScoreBar score={claim.fraudScore} /></td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td className="text-[#6b7280]">{formatDistanceToNow(claim.createdAt)}</td>
                    <td>
                      <GovButton variant="outline" size="sm" onClick={() => { setSelectedClaim(claim); setModalOpen(true); }}>
                        Review
                      </GovButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GovCard>

      <GovModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Insurance Claim Investigation"
        size="xl"
        footer={
          <div className="flex gap-3">
            <GovButton variant="outline" onClick={() => setModalOpen(false)}>Cancel</GovButton>
            {selectedClaim && selectedClaim.fraudScore > 80 ? (
              <GovButton variant="primary" className="bg-danger border-danger">Confirm FIR</GovButton>
            ) : selectedClaim ? (
              <>
                <GovButton variant="danger" onClick={() => handleUpdateClaim(selectedClaim.id, 'REJECTED')}>Reject</GovButton>
                <GovButton variant="primary" onClick={() => handleUpdateClaim(selectedClaim.id, 'APPROVED')}>Approve</GovButton>
              </>
            ) : null}
          </div>
        }
      >
        {selectedClaim && (
          <div className="space-y-6">
            <FraudVerdictDisplay score={selectedClaim.fraudScore} claimId={selectedClaim.id} />
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4 p-4 bg-[#f9fafb] rounded-xl border border-[#f3f4f6]">
                <div className="flex justify-between border-b border-[#e5e7eb] pb-2">
                  <span className="text-[#6b7280] text-[13px]">Claim Number</span>
                  <span className="font-mono font-bold text-primary">{selectedClaim.claimNumber}</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e7eb] pb-2">
                  <span className="text-[#6b7280] text-[13px]">Farmer Name</span>
                  <span className="font-bold">{selectedClaim.farmerName || 'Unknown'}</span>
                </div>
                <div className="flex justify-between border-b border-[#e5e7eb] pb-2">
                  <span className="text-[#6b7280] text-[13px]">Crop</span>
                  <span className="font-bold">{(selectedClaim as any).declaredCrop || 'PADDY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280] text-[13px]">UDLRN</span>
                  <span className="font-mono text-[13px]">{selectedClaim.udlrn}</span>
                </div>
              </div>
              <div>
                <SatelliteEvidencePanel claimId={selectedClaim.id} udlrn={selectedClaim.udlrn} />
              </div>
            </div>
          </div>
        )}
      </GovModal>

      {/* Satellite Data Modal for UDLRN Search */}
      <GovModal
        isOpen={satelliteModalOpen}
        onClose={() => setSatelliteModalOpen(false)}
        title="Farm Satellite Data"
        size="xl"
        footer={
          <div className="flex gap-3">
            <GovButton variant="outline" onClick={() => setSatelliteModalOpen(false)}>Close</GovButton>
          </div>
        }
      >
        {satelliteLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1a6b3c]" />
          </div>
        ) : satelliteData ? (
          <div className="space-y-6">
            {/* Farm Info Card */}
            {satelliteData.udlrn && (
              <div className="bg-[#f9fafb] rounded-xl border border-[#f3f4f6] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#1a6b3c]" />
                  <h2 className="text-lg font-semibold">Farm Details</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6b7280]">UDLRN</p>
                    <p className="font-medium">{satelliteData.udlrn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Crop</p>
                    <p className="font-medium">{satelliteData.declared_crop}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Area</p>
                    <p className="font-medium">{satelliteData.land_area_ha} ha</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Location</p>
                    <p className="font-medium">{satelliteData.gps_lat?.toFixed(4)}, {satelliteData.gps_lng?.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Satellite Image Thumbnail */}
            {satelliteData.satellite_analysis?.thumbnail_b64 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Satellite Image (5km radius)</h2>
                  <span className="text-sm text-gray-500">Sentinel-2</span>
                </div>
                <img 
                  src={satelliteData.satellite_analysis.thumbnail_b64} 
                  alt="Satellite view" 
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}

            {/* NDVI Data */}
            {satelliteData.satellite_analysis?.ndvi && (
              <div className="bg-[#f9fafb] rounded-xl border border-[#f3f4f6] p-6">
                <h2 className="text-lg font-semibold mb-4">NDVI Analysis</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#6b7280]">NDVI Value</p>
                    <p className="font-bold text-xl">{satelliteData.satellite_analysis.ndvi.ndvi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Health</p>
                    <p className="font-medium">{satelliteData.satellite_analysis.ndvi.health_label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Scan Date</p>
                    <p className="font-medium">{satelliteData.satellite_analysis.ndvi.scan_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6b7280]">Cloud Cover</p>
                    <p className="font-medium">{satelliteData.satellite_analysis.ndvi.cloud_cover_pct}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </GovModal>
    </div>
  );
}