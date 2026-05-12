import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Calendar, AlertTriangle } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import StatusBadge from '../../components/ui/StatusBadge';
import GovButton from '../../components/ui/GovButton';
import { useInspectorVisits } from '../../hooks/useInspector';

export default function InspectorHistory() {
  const navigate = useNavigate();
  const { visits, loading } = useInspectorVisits('submitted');

  return (
    <PageTransition>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Inspection History</h1>

        {loading ? (
          <p className="text-gray-500">Loading history...</p>
        ) : visits.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No submitted reports yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Claim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visits.map((visit: any) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{visit.claim_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{visit.visit_type}</td>
                    <td className="px-4 py-3">{visit.submitted_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3"><StatusBadge status={visit.status} /></td>
                    <td className="px-4 py-3">
                      <GovButton size="sm" variant="outline" onClick={() => navigate(`/inspector/visits/${visit.id}`)}>
                        View
                      </GovButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
