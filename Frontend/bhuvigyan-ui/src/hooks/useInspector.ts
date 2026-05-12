import { useState, useEffect, useCallback } from 'react';
import { inspectorApi } from '../api/inspector';
import { useAuth } from '../auth/AuthContext';

export function useInspectorDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      const res = await inspectorApi.getDashboard(user.userId);
      setDashboard(res.data?.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { dashboard, loading, refresh };
}

export function useInspectorVisits(status?: string) {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      const res = await inspectorApi.getVisits(user.userId, status);
      setVisits(res.data?.data || []);
    } catch (err) {
      console.error('Visits fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, status]);

  useEffect(() => { refresh(); }, [refresh]);

  return { visits, loading, refresh };
}
