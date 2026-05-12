import { useState, useEffect, useCallback } from 'react';
import { listConfigs, updateConfig } from '../api/config';
import type { SystemConfig } from '../api/config';

export function useSystemConfig() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listConfigs();
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const update = async (key: string, value: string, description?: string) => {
    setLoading(true);
    try {
      await updateConfig(key, value, description);
      await fetchConfigs();
    } finally {
      setLoading(false);
    }
  };

  return { configs, loading, refresh: fetchConfigs, updateConfig: update };
}
