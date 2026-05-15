import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Activity, Sprout, FileText, Bell, ArrowRight,
  MapPin, ShieldCheck, AlertTriangle, CheckCircle
} from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import NdviChart from '../../components/charts/NdviChart';
import BhumiAICard from '../../components/satellite/BhumiAICard';
import { useFarmerData } from '../../hooks/useFarmerData';
import { useSatelliteData } from '../../hooks/useSatelliteData';
import { useSatelliteTimeseries } from '../../hooks/useSatelliteTimeseries';
import { farmerApi } from '../../api/farmer';
import { useAuth } from '../../auth/AuthContext';
import toast from 'react-hot-toast';

function ndviLabel(score: number) {
  if (score <= 0.14) return { text: 'Critical', color: '#DC2626' };
  if (score <= 0.29) return { text: 'Poor', color: '#F59E0B' };
  if (score <= 0.44) return { text: 'Fair', color: '#F59E0B' };
  if (score <= 0.64) return { text: 'Good', color: '#22C55E' };
  return { text: 'Excellent', color: '#16A34A' };
}

function formatDate(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function FarmerDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { profile, land, carbon, notifications, claims, loading, unreadCount, refetch } = useFarmerData();
  const [farmerId, setFarmerId] = useState<string>('');

  useEffect(() => {
    if (user?.userId) {
      setFarmerId(user.userId);
    }
  }, [user]);

  const { data: satData, loading: satLoading, error: satError, isCached } = useSatelliteData(farmerId);
  const { timeseries: satTimeseries } = useSatelliteTimeseries(farmerId, 12);

  // Fallback: if satellite summary fails but timeseries has data, compute summary from latest point
  const effectiveSatData = satData || (
    satTimeseries && satTimeseries.length > 0
      ? {
          ndvi: {
            ndvi: satTimeseries[satTimeseries.length - 1].ndvi,
            health_label: satTimeseries[satTimeseries.length - 1].label,
            scan_date: (satTimeseries[satTimeseries.length - 1] as any).date || satTimeseries[satTimeseries.length - 1].month,
            cloud_cover_pct: 0,
            source: 'Sentinel-2 (timeseries fallback)',
          },
        } as any
      : null
  );


  const handleMarkAllRead = async () => {
    try {
      await farmerApi.markAllRead();
      refetch();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonLoader variant="rect" height={320} />
          <SkeletonLoader variant="rect" height={320} />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonLoader variant="rect" height={200} />
          <SkeletonLoader variant="rect" height={200} />
        </div>
      </div>
    );
  }

  const ndvi = effectiveSatData?.ndvi?.ndvi ?? carbon?.currentNdvi ?? null;
  const ndviInfo = ndvi != null ? ndviLabel(ndvi) : null;

  const HA_TO_ACRES = 2.47105;
  const summaryNdvi = effectiveSatData?.ndvi?.ndvi ?? null;
  const rawArea = land?.landAreaHa ?? null;
  const summaryAreaAc = rawArea != null ? (Number(rawArea) * HA_TO_ACRES).toFixed(2) : '—';
  const summaryAreaHa = rawArea != null ? Number(rawArea).toFixed(2) : '—';
  const summaryStatus = '—';
  const summaryVerified = effectiveSatData ? 'Verified' : '—';

  // Extract landData from shared schema if available
  const landData = (profile as any)?.landData || null;
  const ndviValue = landData?.ndvi ?? summaryNdvi ?? null;
  const cropHealth = landData?.cropHealth ?? (ndviValue ? ndviLabel(ndviValue).text : '—');

  // Derive missing metrics from live satellite data
  const satNdvi = effectiveSatData?.ndvi?.ndvi ?? null;
  const satNdwi = effectiveSatData?.ndwi?.ndwi ?? null;

  // Crop coverage approximated from NDVI (NDVI 0→0%, 0.8→100%)
  const derivedCropCoverage = satNdvi != null ? Math.min(100, Math.max(0, Math.round((satNdvi / 0.8) * 100))) : null;
  const cropCoverage = landData?.cropCoverage ?? derivedCropCoverage ?? null;

  // Soil moisture approximated from NDWI (NDWI -0.4→0%, 0.4→100%)
  const derivedSoilMoisture = satNdwi != null ? Math.min(100, Math.max(0, Math.round(((satNdwi + 0.4) / 0.8) * 100))) : null;
  const soilMoisture = landData?.soilMoisture ?? derivedSoilMoisture ?? null;

  // Fraud score derived from NDVI (same heuristic as backend)
  const derivedFraudScore = satNdvi != null
    ? (satNdvi < 0.15 ? 85 : satNdvi < 0.30 ? 55 : satNdvi > 0.65 ? 10 : 15)
    : null;
  const fraudScore = landData?.fraudScore ?? derivedFraudScore ?? null;

  const lastSatelliteDate = landData?.lastSatelliteDate ?? satData?.ndvi?.scan_date ?? null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* DEBUG: show actual source */}
      {satData?.ndvi?.source && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${(satData.ndvi.source).includes('Simulated') ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          {(satData.ndvi.source).includes('Simulated') ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span>
            <b>Source: {satData.ndvi.source}</b> {satData.cached ? '(cached)' : '(fresh)'}
          </span>
        </div>
      )}
      {/* Summary Cards - 6 Parameter Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* NDVI */}
        <GovCard className="p-4 flex flex-col items-center gap-2 bg-[#f0fdf4] border-green-200">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-[#1a6b3c]" />
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7280]">NDVI</p>
            <p className="text-lg font-bold text-[#1a1a1a]">{typeof ndviValue === 'number' ? ndviValue.toFixed(2) : '—'}</p>
          </div>
        </GovCard>

        {/* Crop Health */}
        <GovCard className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7280]">Crop Health</p>
            <p className="text-sm font-bold text-[#1a1a1a]">{cropHealth}</p>
          </div>
        </GovCard>

        {/* Crop Coverage */}
        <GovCard className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7280]">Crop Coverage</p>
            <p className="text-lg font-bold text-[#1a1a1a]">{cropCoverage ? `${cropCoverage}%` : '—'}</p>
          </div>
        </GovCard>

        {/* Soil Moisture */}
        <GovCard className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7280]">Soil Moisture</p>
            <p className="text-lg font-bold text-[#1a1a1a]">{soilMoisture ? `${soilMoisture}%` : '—'}</p>
          </div>
        </GovCard>

        {/* Fraud Risk */}
        <GovCard className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7280]">Fraud Risk</p>
            <p className="text-lg font-bold text-[#1a1a1a]">{fraudScore ? `${fraudScore}/100` : '—'}</p>
          </div>
        </GovCard>

        {/* Last Satellite Date */}
        <GovCard className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-xs text-[#6b7280]">Last Scan</p>
            <p className="text-xs font-bold text-[#1a1a1a]">{lastSatelliteDate ? new Date(lastSatelliteDate).toLocaleDateString() : '—'}</p>
          </div>
        </GovCard>
      </div>

      {/* Bhumi AI + NDVI Chart */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Bhumi AI Intelligence */}
        <BhumiAICard
          data={effectiveSatData}
          loading={satLoading}
          isCached={isCached}
        />

        {/* NDVI Trend Chart */}
        <GovCard className="p-5 bg-white rounded-xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px] text-[#111827] flex items-center gap-2">
              <TrendingUp size={18} className="text-[#016B4B]" /> Vegetation Index (NDVI) Trend
            </h3>
            <span className="px-2 py-1 bg-[#F0FAF5] text-[#016B4B] text-[10px] font-bold rounded-full">SATELLITE VERIFIED</span>
          </div>
          <div className="h-[220px]">
            <NdviChart data={satTimeseries?.map(t => ({ month: (t as any).date || t.month, ndvi: t.ndvi })) || carbon?.monthlyNdvi || []} height={220} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>Last scan: {satData?.ndvi?.scan_date || '—'}</span>
            <span>Cloud cover: {satData?.ndvi?.cloud_cover_pct ?? '—'}%</span>
            <span>Source: Sentinel-2 SR</span>
          </div>
        </GovCard>
      </div>

      {/* Recent Claims + Notifications */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent Claims */}
        <GovCard className="p-5 bg-white rounded-xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px] text-[#111827] flex items-center gap-2">
              <FileText size={18} className="text-[#016B4B]" /> Recent Claims
            </h3>
            <button onClick={() => nav('/farmer/claims')} className="text-[12px] font-medium text-[#016B4B] hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </button>
          </div>
          {claims.length === 0 ? (
            <EmptyState icon={FileText} title="No claims filed" message="You haven't filed any claims for this season yet." action={{ label: 'File a Claim', onClick: () => nav('/farmer/claims') }} />
          ) : (
            <div className="space-y-3">
              {claims.slice(0, 3).map((claim) => (
                <button
                  key={claim.id}
                  onClick={() => nav(`/farmer/claims/${claim.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors text-left"
                >
                  <div>
                    <p className="text-[13px] font-bold text-[#111827]">{claim.claimNumber}</p>
                    <p className="text-[11px] text-[#6B7280]">{claim.crop || land?.declaredCrop || '—'} · {land?.season || 'Kharif 2026'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      claim.status === 'APPROVED' ? 'bg-[#F0FAF5] text-[#16A34A]' :
                      claim.status === 'REJECTED' ? 'bg-[#FEF2F2] text-[#EF4444]' :
                      'bg-[#FEF3C7] text-[#F59E0B]'
                    }`}>{claim.status}</span>
                    <p className="text-[12px] font-medium text-[#111827] mt-0.5">₹--</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </GovCard>

        {/* Alerts & Notifications */}
        <GovCard className="p-5 bg-white rounded-xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px] text-[#111827] flex items-center gap-2">
              <Bell size={18} className="text-[#016B4B]" /> Alerts & Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[11px] font-medium text-[#016B4B] hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => nav('/farmer/notifications')} className="text-[12px] font-medium text-[#016B4B] hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="All Caught Up!" message="No new notifications at the moment." />
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => nav('/farmer/notifications')}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border-l-4 text-left transition-colors ${
                    !notif.isRead
                      ? 'bg-[#F0FAF5] border-l-[#016B4B]'
                      : 'bg-white border-l-[#E5E7EB] border border-[#F3F4F6]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold truncate ${!notif.isRead ? 'text-[#111827]' : 'text-[#6B7280]'}`}>{notif.title}</p>
                    <p className={`text-[12px] truncate ${!notif.isRead ? 'text-[#374151]' : 'text-[#9CA3AF]'}`}>{notif.message}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-1">{formatDate(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && <span className="w-2 h-2 bg-[#016B4B] rounded-full shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </GovCard>
      </div>
    </div>
  );
}