import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import StatCard from '../../components/ui/StatCard';
import PageTransition from '../../components/ui/PageTransition';
import GovButton from '../../components/ui/GovButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { useInspectorDashboard } from '../../hooks/useInspector';

export default function InspectorDashboard() {
  const navigate = useNavigate();
  const { dashboard, loading } = useInspectorDashboard();

  const stats = dashboard?.stats || {
    total_assigned: 0,
    pending_acknowledgement: 0,
    acknowledged: 0,
    in_progress: 0,
    submitted_this_month: 0,
    overdue: 0,
    completion_rate_pct: 0,
  };

  const overdueVisits = dashboard?.overdue_visits || [];
  const upcomingVisits = dashboard?.upcoming_visits || [];
  const recentSubmitted = dashboard?.recent_submitted || [];

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Inspector Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Assigned" value={stats.total_assigned} icon={ClipboardList} color="blue" />
          <StatCard label="Acknowledged" value={stats.acknowledged} icon={CheckCircle} color="blue" />
          <StatCard label="In Progress" value={stats.in_progress} icon={Navigation} color="amber" />
          <StatCard label="Submitted" value={stats.submitted_this_month} icon={CheckCircle} color="green" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} color="red" />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Overdue + Upcoming */}
          <div className="col-span-2 space-y-4">
            {/* Overdue */}
            {overdueVisits.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="text-red-700 font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> OVERDUE
                </h3>
                {overdueVisits.map((visit: any) => (
                  <div key={visit.id} className="bg-white rounded-lg p-3 mb-2 border border-red-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">Claim {visit.claim_id?.slice(0, 8)}...</p>
                        <p className="text-sm text-gray-500">Due: {visit.due_date}</p>
                        <p className="text-sm text-gray-500">Trigger: {visit.trigger_reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <GovButton size="sm" onClick={() => navigate(`/inspector/visits/${visit.id}`)}>
                          View
                        </GovButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Visits */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Upcoming Visits</h3>
              {upcomingVisits.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming visits</p>
              ) : (
                upcomingVisits.map((visit: any) => (
                  <div key={visit.id} className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          Claim {visit.claim_id?.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {visit.due_date} | Type: {visit.visit_type}
                        </p>
                        <p className="text-sm text-gray-500">
                          Trigger: {visit.trigger_reason} | Score: {visit.fraud_score_at_assignment}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status={visit.status} />
                        <GovButton size="sm" onClick={() => navigate(`/inspector/visits/${visit.id}`)}>
                          View Details
                        </GovButton>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Recent + Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Completion Rate</h3>
              <div className="text-4xl font-bold text-green-600">{stats.completion_rate_pct}%</div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Submissions</h3>
              {recentSubmitted.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent submissions</p>
              ) : (
                recentSubmitted.map((visit: any) => (
                  <div key={visit.id} className="py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-medium text-gray-700">
                      Claim {visit.claim_id?.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500">Submitted: {visit.submitted_at?.slice(0, 10)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
