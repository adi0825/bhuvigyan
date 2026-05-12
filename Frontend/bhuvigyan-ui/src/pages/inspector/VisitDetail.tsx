import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Shield, Satellite } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../../components/ui/PageTransition';
import GovButton from '../../components/ui/GovButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { inspectorApi } from '../../api/inspector';
import { useAuth } from '../../auth/AuthContext';

export default function VisitDetail() {
  const { id: visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await inspectorApi.getVisitDetail(visitId!);
        setVisit(res.data?.data);
      } catch (err) {
        console.error('Fetch visit error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (visitId) fetch();
  }, [visitId]);

  const handleAcknowledge = async () => {
    if (!user?.userId || !scheduledDate) return;
    try {
      await inspectorApi.acknowledgeVisit(visitId!, user.userId, scheduledDate);
      setVisit({ ...visit, status: 'acknowledged', scheduled_date: scheduledDate });
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  const handleStart = async () => {
    if (!navigator.geolocation || !user?.userId) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await inspectorApi.startVisit(
          visitId!, user.userId,
          pos.coords.latitude, pos.coords.longitude
        );
        navigate(`/inspector/visits/${visitId}/report`);
      } catch (err) {
        console.error('Start visit error:', err);
      }
    });
  };

  if (loading) return <div className="p-6">Loading visit details...</div>;
  if (!visit) return <div className="p-6">Visit not found</div>;

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Visit Detail</h1>
          <StatusBadge status={visit.status} />
        </div>

        {/* Claim & Farmer Summary */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" /> Claim & Farmer Summary
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Claim ID</p>
              <p className="font-mono">{visit.claim_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Farmer ID</p>
              <p className="font-mono">{visit.farmer_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Visit Type</p>
              <p>{visit.visit_type}</p>
            </div>
            <div>
              <p className="text-gray-500">Trigger Reason</p>
              <p>{visit.trigger_reason}</p>
            </div>
            <div>
              <p className="text-gray-500">Fraud Score at Assignment</p>
              <p className="font-bold text-red-600">{visit.fraud_score_at_assignment || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Due Date</p>
              <p>{visit.due_date}</p>
            </div>
          </div>
        </div>

        {/* Satellite Intelligence */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Satellite className="w-5 h-5 text-blue-600" /> Satellite Intelligence
          </h2>
          <p className="text-sm text-gray-500">
            Live satellite data will be loaded when visit starts. NDVI and SAR data will be pulled from GEE.
          </p>
        </div>

        {/* Farm Location */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" /> Farm Location
          </h2>
          <p className="text-sm text-gray-500">
            GPS coordinates and map will be available when the visit is started.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {visit.status === 'assigned' && (
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <GovButton variant="primary" onClick={handleAcknowledge} disabled={!scheduledDate}>
                <Calendar className="w-4 h-4 mr-1" /> Schedule Visit
              </GovButton>
            </div>
          )}
          {visit.status === 'acknowledged' && (
            <GovButton variant="primary" onClick={handleStart}>
              <MapPin className="w-4 h-4 mr-1" /> Start Visit Now
            </GovButton>
          )}
          {visit.status === 'in_progress' && (
            <GovButton variant="primary" onClick={() => navigate(`/inspector/visits/${visitId}/report`)}>
              Submit Report
            </GovButton>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
