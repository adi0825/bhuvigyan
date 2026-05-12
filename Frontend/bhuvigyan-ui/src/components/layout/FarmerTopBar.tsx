import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CloudSun, Droplets, Wind } from 'lucide-react';
import type { FarmerProfile, LandData } from '../../types';
import { farmerApi } from '../../api/farmer';
import SkeletonLoader from '../ui/SkeletonLoader';

interface Props {
  profile: FarmerProfile | null;
  land: LandData | null;
  unreadCount: number;
  loading: boolean;
}

export default function FarmerTopBar({ profile, land, unreadCount, loading }: Props) {
  const nav = useNavigate();
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!land?.district) return;
      setWeatherLoading(true);
      try {
        const res = await farmerApi.getWeather(land.district, land.state || '');
        setWeather((res as any).data?.data || null);
      } catch {
        // silent fail — weather is non-critical
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [land?.district, land?.state]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-5 py-3 flex items-center justify-between gap-4">
      {/* Left: Greeting */}
      <div>
        <p className="text-[12px] font-bold text-[#6B7280] uppercase tracking-widest">
          नमस्ते / NAMASTE,
        </p>
        <h1 className="text-[18px] font-extrabold text-[#111827] leading-tight">
          {loading ? (
            <SkeletonLoader variant="text" />
          ) : (
            profile?.fullName || 'Farmer'
          )}
        </h1>
        <p className="text-[11px] text-[#6B7280] mt-0.5">
          {land?.season || 'Kharif 2026'}
        </p>
      </div>

      {/* Right: Weather + Notifications + Avatar */}
      <div className="flex items-center gap-3">
        {/* Weather Card */}
        <div className="hidden md:flex items-center gap-3 bg-[#F7F8FA] rounded-xl px-3 py-2 border border-[#E5E7EB]">
          {weatherLoading ? (
            <SkeletonLoader variant="text" width={180} />
          ) : weather ? (
            <>
              <div className="flex items-center gap-1.5">
                <CloudSun size={16} className="text-[#F59E0B]" />
                <span className="text-[12px] font-bold text-[#111827]">{weather.temp}°C</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#6B7280]">
                <Droplets size={12} />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#6B7280]">
                <Wind size={12} />
                <span>{weather.windSpeed} km/h</span>
              </div>
              <span className="text-[11px] text-[#016B4B] font-medium hidden lg:inline">{weather.condition}</span>
            </>
          ) : (
            <span className="text-[11px] text-[#6B7280]">Weather unavailable</span>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => nav('/farmer/notifications')}
          className="relative p-2 rounded-lg hover:bg-[#F0FAF5] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-[#6B7280]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 bg-[#016B4B] rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0">
          {profile?.fullName?.charAt(0) || 'F'}
        </div>
      </div>
    </header>
  );
}
