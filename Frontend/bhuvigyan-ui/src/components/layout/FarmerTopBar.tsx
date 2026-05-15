import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CloudSun, Droplets, Wind, MapPin, Thermometer, Navigation, X,
  CheckCircle2, AlertTriangle, Info, CloudRain, Sun, Cloud, Eye
} from 'lucide-react';
import type { FarmerProfile, LandData } from '../../types';
import { farmerApi } from '../../api/farmer';
import api from '../../api/axios';
import SkeletonLoader from '../ui/SkeletonLoader';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

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
  const [weatherOpen, setWeatherOpen] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<HTMLDivElement>(null);

  // Fetch weather
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

  // Fetch notifications when popup opens
  const fetchNotifs = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 20, offset: 0 } });
      setNotifs(res.data.data?.items || []);
    } catch {
      setNotifs([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try { await api.put(`/notifications/${id}/read`); } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await api.put('/notifications/mark-all-read'); } catch { /* ignore */ }
  };

  const toggleNotif = () => {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    setWeatherOpen(false);
    if (willOpen) fetchNotifs();
  };

  const toggleWeather = () => {
    setWeatherOpen(!weatherOpen);
    setNotifOpen(false);
  };

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (weatherRef.current && !weatherRef.current.contains(e.target as Node)) setWeatherOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeColors: Record<string, string> = {
    CLAIM_SUBMITTED: 'bg-blue-50 text-blue-700',
    INSPECTION_ASSIGNED: 'bg-yellow-50 text-yellow-700',
    CLAIM_APPROVED: 'bg-green-50 text-green-700',
    CLAIM_REJECTED: 'bg-red-50 text-red-700',
    FRAUD_ALERT: 'bg-red-50 text-red-700',
  };

  const notifUnread = notifs.filter((n) => !n.isRead).length;

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
        {/* Weather Card (clickable) */}
        <div className="relative" ref={weatherRef}>
          <button
            onClick={toggleWeather}
            className="hidden md:flex items-center gap-3 bg-[#F7F8FA] rounded-xl px-3 py-2 border border-[#E5E7EB] hover:bg-[#F0FAF5] transition-colors"
          >
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
                <Eye size={12} className="text-[#9CA3AF]" />
              </>
            ) : (
              <span className="text-[11px] text-[#6B7280]">Weather unavailable</span>
            )}
          </button>

          {/* Weather Popup */}
          {weatherOpen && weather && (
            <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl border border-[#E5E7EB] shadow-xl z-[60] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-[#F59E0B]" /> Weather Details
                </h3>
                <button onClick={() => setWeatherOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={16} className="text-[#6B7280]" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[#F0FAF5] rounded-xl">
                  <Thermometer className="w-5 h-5 text-[#EF4444]" />
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase font-semibold">Temperature</p>
                    <p className="text-lg font-bold text-[#111827]">{weather.temp}°C</p>
                    <p className="text-[11px] text-[#6B7280] capitalize">{weather.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-[10px] text-blue-600 uppercase font-semibold">Humidity</p>
                    <p className="text-lg font-bold text-blue-700">{weather.humidity}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Wind Speed</p>
                    <p className="text-lg font-bold text-gray-700">{weather.windSpeed} km/h</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <p className="text-[10px] text-amber-600 uppercase font-semibold">Condition</p>
                    <p className="text-sm font-bold text-amber-700">{weather.condition}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <p className="text-[10px] text-green-600 uppercase font-semibold">Location</p>
                    <p className="text-xs font-bold text-green-700 flex items-center gap-1">
                      <MapPin size={10} />
                      {weather.location?.lat?.toFixed(4)}, {weather.location?.lon?.toFixed(4)}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-[#9CA3AF] text-center">
                  Live data from OpenWeatherMap for your farm coordinates
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell with Popup */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotif}
            className="relative p-2 rounded-lg hover:bg-[#F0FAF5] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-[#6B7280]" />
            {(notifUnread > 0 || unreadCount > 0) && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifUnread > 9 ? '9+' : notifUnread || unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popup */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white rounded-2xl border border-[#E5E7EB] shadow-xl z-[60] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#F3F4F6]">
                <h3 className="text-sm font-bold text-[#111827]">Notifications</h3>
                {notifUnread > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-medium text-[#016B4B] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {notifLoading ? (
                  <div className="text-center py-8 text-[#6B7280] text-sm">Loading...</div>
                ) : notifs.length === 0 ? (
                  <div className="text-center py-8 text-[#6B7280] text-sm">No notifications</div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        n.isRead
                          ? 'border-[#F3F4F6] opacity-70 bg-white'
                          : 'border-l-4 border-l-[#016B4B] border-[#E5E7EB] bg-[#F0FAF5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[n.type] || 'bg-gray-100 text-gray-700'}`}>
                          {n.type.replace(/_/g, ' ')}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 bg-[#EF4444] rounded-full" />}
                      </div>
                      <p className="font-bold text-[12px] text-[#111827]">{n.title}</p>
                      <p className="text-[11px] text-[#6B7280]">{n.message}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 bg-[#016B4B] rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0">
          {profile?.fullName?.charAt(0) || 'F'}
        </div>
      </div>
    </header>
  );
}
