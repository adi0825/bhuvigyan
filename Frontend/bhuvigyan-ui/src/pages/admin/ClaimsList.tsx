import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import StatusBadge from '../../components/ui/StatusBadge';
import FraudScoreBar from '../../components/ui/FraudScoreBar';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { adminApi } from '../../api/admin';
import { adminInspectorApi } from '../../api/inspector';
import type { Claim, FilterOptions } from '../../types';
import PageTransition from '../../components/ui/PageTransition';

export default function ClaimsList() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [selectedInspector, setSelectedInspector] = useState('');
  const [visitType, setVisitType] = useState('inspection');
  const [assigning, setAssigning] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getClaims(filters);
      const payload = (response as any).data?.data;
      setClaims(Array.isArray(payload) ? payload : payload?.claims || []);
    } catch (error) {
      toast.error('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [filters]);

  const openAssignModal = async (claim: Claim) => {
    setSelectedClaim(claim);
    setShowAssignModal(true);
    try {
      const res = await adminInspectorApi.listInspectors();
      setInspectors(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load inspectors');
    }
  };

  const handleAssign = async () => {
    if (!selectedClaim || !selectedInspector) return;
    setAssigning(true);
    try {
      await adminInspectorApi.assignInspector(selectedClaim.id, 'admin', {
        inspector_id: selectedInspector,
        visit_type: visitType,
        trigger_reason: 'manual',
      });
      toast.success('Inspector assigned successfully');
      setShowAssignModal(false);
      setSelectedClaim(null);
      setSelectedInspector('');
      fetchClaims();
    } catch (err) {
      toast.error('Failed to assign inspector');
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (id: string, action: string) => {
    try {
      if (action === 'APPROVED') {
        await adminApi.approveClaim(id);
      } else if (action === 'REJECTED') {
        await adminApi.rejectClaim(id, 'Rejected by admin');
      }
      toast.success(`Claim ${action.toLowerCase()} successfully`);
      fetchClaims();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">Insurance Claims</h1>
            <p className="text-[#6b7280]">Manage and review all crop insurance claims</p>
          </div>
          <div className="flex gap-3">
            <GovButton variant="outline">
              <Download size={16} />
              Export CSV
            </GovButton>
            <GovButton variant="primary">
              <Filter size={16} />
              Advanced Filters
            </GovButton>
          </div>
        </div>

        <GovCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  className="gov-input pl-10"
                  placeholder="Search claims by Number, Farmer or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <select className="gov-input w-full md:w-48">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </GovCard>

        {loading ? (
          <SkeletonLoader variant="table" />
        ) : claims.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No claims found"
            message="No insurance claims match your current filter criteria."
            action={{
              label: "Reset Filters",
              onClick: () => setFilters({})
            }}
          />
        ) : (
          <GovCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Farmer</th>
                    <th>District</th>
                    <th className="w-48">Risk Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(claims) ? claims : []).map((claim) => (
                    <tr key={claim.id}>
                      <td className="font-mono font-bold text-primary">{claim.claimNumber}</td>
                      <td className="font-bold">{claim.farmerName || 'Rajesh Kumar'}</td>
                      <td>{claim.district}</td>
                      <td>
                        <FraudScoreBar score={claim.fraudScore} />
                      </td>
                      <td>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <GovButton
                            variant="outline"
                            size="sm"
                            className="px-2"
                            onClick={() => navigate(`/admin/claims/${claim.id}`)}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </GovButton>
                          <GovButton
                            variant="outline"
                            size="sm"
                            className="px-2 text-blue-600 hover:bg-blue-50 border-blue-300"
                            onClick={() => openAssignModal(claim)}
                            title="Assign Inspector"
                          >
                            <ShieldCheck size={14} />
                          </GovButton>
                          <GovButton
                            variant="outline"
                            size="sm"
                            className="px-2 text-success hover:bg-success/10 border-success/30"
                            onClick={() => handleStatusUpdate(claim.id, 'APPROVED')}
                          >
                            <CheckCircle size={14} />
                          </GovButton>
                          <GovButton
                            variant="outline"
                            size="sm"
                            className="px-2 text-danger hover:bg-danger/10 border-danger/30"
                            onClick={() => handleStatusUpdate(claim.id, 'REJECTED')}
                          >
                            <XCircle size={14} />
                          </GovButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovCard>
        )}

        {/* Assign Inspector Modal */}
        {showAssignModal && selectedClaim && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                Assign Inspector
              </h2>
              <p className="text-sm text-gray-500">
                Claim: <span className="font-mono font-medium">{selectedClaim.claimNumber}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Inspector</label>
                <select
                  value={selectedInspector}
                  onChange={(e) => setSelectedInspector(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Choose an inspector...</option>
                  {inspectors.map((insp: any) => (
                    <option key={insp.id} value={insp.id}>
                      {insp.full_name} ({insp.employee_id}) — {insp.completed_visits}/{insp.total_visits} visits
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="inspection">Field Inspection</option>
                  <option value="cce_visit">CCE Visit</option>
                  <option value="fraud_investigation">Fraud Investigation</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <GovButton variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </GovButton>
                <GovButton
                  variant="primary"
                  onClick={handleAssign}
                  disabled={!selectedInspector || assigning}
                >
                  {assigning ? 'Assigning...' : 'Assign Inspector'}
                </GovButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}