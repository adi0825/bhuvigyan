import { useState, useCallback } from 'react';
import { getDossier, downloadDossierPdf } from '../api/dossier';
import type { DossierData } from '../api/dossier';

export function useDossier() {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDossier = useCallback(async (claimId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDossier(claimId);
      setDossier(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dossier');
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPdf = (claimId: string) => {
    window.open(downloadDossierPdf(claimId), '_blank');
  };

  return { dossier, loading, error, fetchDossier, downloadPdf };
}
