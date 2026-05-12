import { useState, useEffect, useCallback } from 'react';
import { farmerApi } from '../api/farmer';
import type { FarmerProfile, LandData, CarbonData, Notification, Claim } from '../types';

interface UseFarmerDataResult {
  profile: FarmerProfile | null;
  land: LandData | null;
  carbon: CarbonData | null;
  notifications: Notification[];
  claims: Claim[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  unreadCount: number;
}

export function useFarmerData(): UseFarmerDataResult {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [land, setLand] = useState<LandData | null>(null);
  const [carbon, setCarbon] = useState<CarbonData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      farmerApi.getProfile(),
      farmerApi.getLand(),
      farmerApi.getCarbon(),
      farmerApi.getNotifications(),
      farmerApi.getClaims(),
    ]);

    const [profileRes, landRes, carbonRes, notifRes, claimsRes] = results;

    if (profileRes.status === 'fulfilled') {
      const raw = profileRes.value as any;
      const data = raw.data?.data || raw.data;
      setProfile(data);
    }
    if (landRes.status === 'fulfilled') {
      const raw = landRes.value as any;
      const data = raw.data?.data || raw.data;
      setLand(data);
    }
    if (carbonRes.status === 'fulfilled') {
      const raw = carbonRes.value as any;
      const data = raw.data?.data || raw.data;
      setCarbon(data);
    }
    if (notifRes.status === 'fulfilled') {
      const raw = notifRes.value as any;
      const notifData = raw.data?.data || raw.data;
      if (Array.isArray(notifData)) {
        setNotifications(notifData);
      }
    }
    if (claimsRes.status === 'fulfilled') {
      const raw = claimsRes.value as any;
      const data = raw.data?.data || raw.data;
      setClaims(Array.isArray(data) ? data : []);
    }

    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      setError('Some data failed to load');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    profile,
    land,
    carbon,
    notifications,
    claims,
    loading,
    error,
    refetch: fetchData,
    unreadCount,
  };
}
