import { useState, useEffect, useCallback } from 'react';
import { listAdapters, getAdapter, updateAdapter } from '../api/adapters';
import type { StateAdapter } from '../api/adapters';

export function useStateAdapters() {
  const [adapters, setAdapters] = useState<StateAdapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdapters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdapters();
      setAdapters(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load adapters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdapters();
  }, [fetchAdapters]);

  const update = async (stateCode: string, data: Partial<StateAdapter>) => {
    setLoading(true);
    try {
      await updateAdapter(stateCode, data);
      await fetchAdapters();
    } finally {
      setLoading(false);
    }
  };

  return { adapters, loading, error, refresh: fetchAdapters, updateAdapter: update };
}

export function useStateAdapter(stateCode?: string) {
  const [adapter, setAdapter] = useState<StateAdapter | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdapter = useCallback(async () => {
    if (!stateCode) return;
    setLoading(true);
    try {
      const data = await getAdapter(stateCode);
      setAdapter(data);
    } finally {
      setLoading(false);
    }
  }, [stateCode]);

  useEffect(() => {
    fetchAdapter();
  }, [fetchAdapter]);

  return { adapter, loading, refresh: fetchAdapter };
}
