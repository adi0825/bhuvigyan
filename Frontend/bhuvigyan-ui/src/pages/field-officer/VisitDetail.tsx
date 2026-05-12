import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import {
  ArrowLeft, MapPin, Calendar, User, Phone, AlertTriangle,
  CheckCircle, Clock, Camera, Ruler, Sprout, ThermometerSun,
  Navigation, ShieldCheck, ChevronRight, Satellite, TrendingUp, Cloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import PageTransition from '../../components/ui/PageTransition';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useVisitDetail, useGpsVerification } from '../../hooks/useOfficerData';
import type { VisitStatus } from '../../types';

function StatusPill({ status }: { status: VisitStatus }) {
  const styles: Record<string, string> = {
    ASSIGNED: 'bg-amber-100 text-amber-700 border-amber-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const icons: Record<string, React.ReactNode> = {
    ASSIGNED: <Clock size={14} />,
    IN_PROGRESS: <Navigation size={14} className="animate-pulse" />,
    COMPLETED: <CheckCircle size={14} />,
    CANCELLED: <AlertTriangle size={14} />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.ASSIGNED}`}>
      {icons[status]} {status.replace('_', ' ')}
    </span>
  );
}

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { visit, loading, error } = useVisitDetail(id);
  const { verifying, result, error: gpsError, verify } = useGpsVerification();
  const [showGpsResult, setShowGpsResult] = useState(false);

  const [satData, setSatData] = useState<any>(null);
  const [satLoading, setSatLoading] = useState(false);

  useEffect(() => {
    if (visit?.gpsLat && visit?.gpsLng) {
      setSatLoading(true);
      api.get(`/satellite/ndvi?lat=${visit.gpsLat}&lng=${visit.gpsLng}&days_back=30`)
        .then(r => setSatData(r.data?.data))
        .catch(() => {})
        .finally(() => setSatLoading(false));
    }
  }, [visit?.gpsLat, visit?.gpsLng]);

  const handleStartVisit = async () => {
    if (!id) return;
    setShowGpsResult(true);
    await verify(id);
  };

  const handleInspect = () => {
    if (!id) return;
    navigate(`/field/inspect/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading visit details..." />
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-gray-600">{error || 'Visit not found'}</p>
        <GovButton variant="outline" onClick={() => navigate('/field/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </GovButton>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <GovButton variant="outline" size="sm" onClick={() => navigate('/field/dashboard')}>
            <ArrowLeft size={16} />
          </GovButton>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold text-[#1a1a1a]">Visit {visit.visitNumber}</h1>
              <StatusPill status={visit.status} />
              {visit.priority !== 'NORMAL' && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${visit.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {visit.priority}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Claim: {visit.claimNumber} | UDLRN: {visit.udlrn}</p>
          </div>
        </div>

        {/* Action Bar */}
        {visit.status === 'ASSIGNED' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GovCard className="p-4 bg-blue-50 border-blue-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-blue-800">Ready to start field inspection?</p>
                  <p className="text-sm text-blue-600">GPS verification is required before proceeding.</p>
                </div>
                <GovButton variant="primary" onClick={handleStartVisit} loading={verifying}>
                  <Navigation size={18} /> {verifying ? 'Verifying GPS...' : 'Start Visit & Verify GPS'}
                </GovButton>
              </div>
              {showGpsResult && result && (
                <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${result.gpsMatch ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {result.message} (Distance: {result.distanceMeters}m)
                </div>
              )}
              {showGpsResult && gpsError && (
                <div className="mt-3 p-3 rounded-lg text-sm font-medium bg-red-100 text-red-800">
                  GPS Error: {gpsError}
                </div>
              )}
            </GovCard>
          </motion.div>
        )}

        {visit.status === 'IN_PROGRESS' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GovCard className="p-4 bg-green-50 border-green-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-green-800">Visit in progress</p>
                  <p className="text-sm text-green-600">GPS verified. Complete the inspection form now.</p>
                </div>
                <GovButton variant="primary" onClick={handleInspect}>
                  <ChevronRight size={18} /> Continue Inspection
                </GovButton>
              </div>
            </GovCard>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Farmer Info */}
            <GovCard>
              <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <User size={18} className="text-primary" /> Farmer Details
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Name</p>
                  <p className="text-sm font-bold text-[#1a1a1a]">{visit.farmer?.fullName || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Mobile</p>
                  <p className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1">
                    <Phone size={14} /> {visit.farmer?.mobile || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Location</p>
                  <p className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1">
                    <MapPin size={14} /> {[visit.location?.district, visit.location?.taluk, visit.location?.village].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Scheduled Date</p>
                  <p className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1">
                    <Calendar size={14} /> {visit.scheduledDate ? new Date(visit.scheduledDate).toLocaleDateString('en-IN') : 'Not scheduled'}
                  </p>
                </div>
              </div>
            </GovCard>

            {/* Claim Info */}
            <GovCard>
              <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" /> Claim Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Declared Crop</p>
                  <p className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1">
                    <Sprout size={14} /> {visit.declaredCrop || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Land Area</p>
                  <p className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1">
                    <Ruler size={14} /> {visit.landAreaHa ? `${visit.landAreaHa} ha` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Fraud Score</p>
                  <p className={`text-sm font-bold ${(visit.fraudScore || 0) > 60 ? 'text-red-600' : 'text-green-600'}`}>
                    {visit.fraudScore ?? 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">NDVI</p>
                  <p className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1">
                    <ThermometerSun size={14} /> Sowing: {visit.ndviSowing?.toFixed(2) ?? 'N/A'} | Claim: {visit.ndviClaim?.toFixed(2) ?? 'N/A'}
                  </p>
                </div>
              </div>
              {visit.notesToOfficer && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700 font-bold uppercase mb-1">Notes to Officer</p>
                  <p className="text-sm text-amber-800">{visit.notesToOfficer}</p>
                </div>
              )}
            </GovCard>

            {/* Satellite Intelligence */}
            <GovCard className="border-l-4 border-l-blue-500">
              <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Satellite size={18} className="text-blue-600" /> Satellite Intelligence
              </h2>
              {satLoading ? (
                <p className="text-sm text-gray-500">Fetching live satellite data...</p>
              ) : satData ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Current NDVI</p>
                    <p className="text-sm font-bold flex items-center gap-1">
                      <TrendingUp size={14} className={satData.ndvi > 0.5 ? 'text-green-600' : satData.ndvi > 0.3 ? 'text-yellow-600' : 'text-red-600'} />
                      {satData.ndvi?.toFixed(3) ?? 'N/A'} — {satData.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{satData.source}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Scan Date</p>
                    <p className="text-sm font-bold">{satData.date}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{satData.resolution_m}m resolution</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Comparison</p>
                    <p className={`text-sm font-bold ${(satData.ndvi > 0.5 && (visit.damagePercent || 0) > 30) ? 'text-red-600' : 'text-green-600'}`}>
                      {(satData.ndvi > 0.5 && (visit.damagePercent || 0) > 30) ? 'Possible mismatch' : 'Consistent'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      NDVI={satData.ndvi?.toFixed(2)} vs Claimed damage={(visit.damagePercent ?? 0)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Satellite data unavailable for this location.</p>
              )}
            </GovCard>

            {/* Inspection Results (if completed) */}
            {visit.status === 'COMPLETED' && (
              <GovCard className="border-l-4 border-l-green-500">
                <h2 className="text-base font-bold text-[#1a1a1a] mb-4">Inspection Results</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Crop Found</p>
                    <p className="text-sm font-bold">{visit.cropFound || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Crop Match</p>
                    <p className={`text-sm font-bold ${visit.cropMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {visit.cropMatch ? 'YES' : 'NO'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Damage %</p>
                    <p className="text-sm font-bold">{visit.damagePercent ?? 'N/A'}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Area Visited</p>
                    <p className="text-sm font-bold">{visit.areaVisitedHa ? `${visit.areaVisitedHa} ha` : 'N/A'}</p>
                  </div>
                </div>
                {visit.remarks && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium uppercase">Remarks</p>
                    <p className="text-sm text-gray-700 mt-1">{visit.remarks}</p>
                  </div>
                )}
                {visit.recommendation && (
                  <div className={`mt-4 p-3 rounded-xl font-bold text-sm ${visit.recommendation === 'APPROVE' ? 'bg-green-100 text-green-800' : visit.recommendation === 'REJECT' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    Recommendation: {visit.recommendation}
                  </div>
                )}
              </GovCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Photos */}
            <GovCard>
              <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Camera size={18} className="text-primary" /> Photos ({visit.photos.length})
              </h2>
              {visit.photos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No photos uploaded yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {visit.photos.map((photo) => (
                    <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                      <img src={photo.photoUrl} alt={photo.caption || 'Visit photo'} className="w-full h-full object-cover" />
                      {photo.gpsLat && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate">
                          <MapPin size={10} className="inline" /> {photo.gpsLat.toFixed(4)}, {photo.gpsLng?.toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GovCard>

            {/* GPS Status */}
            <GovCard>
              <h2 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary" /> GPS Status
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Land GPS</p>
                  <p className="text-sm font-mono">
                    {visit.landGpsLat?.toFixed(6) ?? 'N/A'}, {visit.landGpsLng?.toFixed(6) ?? 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 font-medium uppercase">Officer GPS</p>
                  <p className="text-sm font-mono">
                    {visit.gpsLat?.toFixed(6) ?? 'Not captured'}, {visit.gpsLng?.toFixed(6) ?? 'Not captured'}
                  </p>
                </div>
                {visit.gpsMatch !== null && (
                  <div className={`p-3 rounded-xl text-sm font-bold ${visit.gpsMatch ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {visit.gpsMatch ? 'GPS matches land boundary' : 'GPS outside land boundary'}
                    {visit.distanceMeters !== null && ` (${visit.distanceMeters}m)`}
                  </div>
                )}
              </div>
            </GovCard>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
