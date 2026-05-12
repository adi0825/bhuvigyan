import { useState, useEffect, useCallback } from 'react';
import { listModels, promoteModel } from '../api/models';
import type { ModelVersion } from '../api/models';

export function useModelRegistry() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listModels();
      setModels(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const promote = async (modelId: string, notes?: string) => {
    setLoading(true);
    try {
      await promoteModel(modelId, notes);
      await fetchModels();
    } finally {
      setLoading(false);
    }
  };

  const productionModel = models.find((m) => m.status === 'PRODUCTION');
  const stagingModels = models.filter((m) => m.status === 'STAGING');

  return { models, productionModel, stagingModels, loading, error, refresh: fetchModels, promote };
}
