import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Activity, Sprout, FileText, Bell, ArrowRight
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
  const { profile, land, carbon, notifications, claims, loading, unreadCount, refetch } = useFarmerData();
  const [farmerId, setFarmerId] = useState<string>('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFarmerId(user.userId || '');
      } catch {}
    }
  }, []);

  const { data: satData, loading: satLoading, isCached } = useSatelliteData(farmerId);
  const { timeseries: satTimeseries } = useSatelliteTimeseries(farmerId, 12);

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

  const ndvi = satData?.ndvi?.ndvi ?? carbon?.currentNdvi ?? 0.42;
  const ndviInfo = ndviLabel(ndvi);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Bhumi AI + NDVI Chart */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Bhumi AI Intelligence */}
        <BhumiAICard
          data={satData}
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
            <NdviChart data={satTimeseries?.map(t => ({ month: t.month, ndvi: t.ndvi })) || carbon?.monthlyNdvi || []} height={220} />
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