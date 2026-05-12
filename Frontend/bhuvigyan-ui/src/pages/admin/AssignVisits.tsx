import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList, MapPin, Calendar, User, Search,
  ChevronRight, CheckCircle, AlertTriangle, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import GovModal from '../../components/ui/GovModal';
import PageTransition from '../../components/ui/PageTransition';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { useAdminVisits } from '../../hooks/useOfficerData';
import { adminVisitApi } from '../../api/officer';
import type { AdminVisit } from '../../types';

function VisitStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ASSIGNED: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${map[status] || map.ASSIGNED}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function AssignVisits() {
  const navigate = useNavigate();
  const { visits, loading, error, refetch } = useAdminVisits();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<AdminVisit | null>(null);
  const [officerId, setOfficerId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assigning, setAssigning] = useState(false);

  const filtered = visits.filter(v => {
    const matchesSearch = !search ||
      v.claim_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.farmer_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.officer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAssign = async () => {
    if (!selectedVisit || !officerId || !scheduledDate) {
      toast.error('Please fill all fields');
      return;
    }
    setAssigning(true);
    try {
      await adminVisitApi.assignVisit({
        claimId: selectedVisit.claim_id || '',
        officerId,
        scheduledDate,
        priority: 'NORMAL',
      });
      toast.success('Visit assigned successfully');
      setAssignModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" text="Loading visits..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a]">Assign Field Visits</h1>
            <p className="text-[#6b7280] text-sm">Manage CCE visit assignments to field officers</p>
          </div>
          <GovButton variant="primary" onClick={() => { setSelectedVisit(null); setAssignModalOpen(true); }}>
            <ClipboardList size={16} /> New Assignment
          </GovButton>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by claim, farmer, or officer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="gov-input pl-9 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="gov-input w-full sm:w-48"
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Visits Table */}
        <GovCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f9fafb] text-left text-xs font-bold text-gray-500 uppercase">
                  <th className="px-4 py-3">Visit #</th>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState icon={ClipboardList} title="No visits found" message="No CCE visits match your filters." />
                    </td>
                  </tr>
                ) : (
                  filtered.map((visit) => (
                    <motion.tr
                      key={visit.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{visit.visit_number}</td>
                      <td className="px-4 py-3 text-sm">{visit.claim_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{visit.farmer_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        {visit.officer_name ? (
                          <div>
                            <p className="font-medium">{visit.officer_name}</p>
                            <p className="text-xs text-gray-400">{visit.designation}</p>
                          </div>
                        ) : (
                          <span className="text-amber-600 text-xs font-bold">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{visit.district_name || 'N/A'}</td>
                      <td className="px-4 py-3"><VisitStatusBadge status={visit.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {visit.scheduled_date ? new Date(visit.scheduled_date).toLocaleDateString('en-IN') : 'Not set'}
                      </td>
                      <td className="px-4 py-3">
                        <GovButton
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedVisit(visit); setAssignModalOpen(true); }}
                        >
                          {visit.officer_name ? 'Reassign' : 'Assign'}
                        </GovButton>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GovCard>
      </div>

      {/* Assign Modal */}
      <GovModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign CCE Visit"
        size="md"
        footer={
          <div className="flex gap-3">
            <GovButton variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</GovButton>
            <GovButton variant="primary" onClick={handleAssign} loading={assigning}>
              {assigning ? 'Assigning...' : 'Assign Visit'}
            </GovButton>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedVisit && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p><strong>Claim:</strong> {selectedVisit.claim_number}</p>
              <p><strong>Farmer:</strong> {selectedVisit.farmer_name}</p>
            </div>
          )}
          <GovInput
            label="Officer ID / Email"
            value={officerId}
            onChange={e => setOfficerId(e.target.value)}
            placeholder="officer@bhuvigyan.gov.in"
            required
          />
          <GovInput
            label="Scheduled Date"
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            required
          />
        </div>
      </GovModal>
    </PageTransition>
  );
}
