import { useState, useEffect, useCallback } from 'react';
import { officerApi, adminVisitApi, disasterApi } from '../api/officer';
import type { OfficerStats, OfficerVisit, VisitDetail, InspectionFormData, DisasterEventActive, AdminVisit } from '../types';

export function useOfficerStats() {
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    officerApi.getStats()
      .then(res => setStats(res.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

export function useOfficerVisits(status?: string) {
  const [visits, setVisits] = useState<OfficerVisit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await officerApi.getVisits(status ? { status } : undefined);
      setVisits(res.data.data.visits);
      setTotal(res.data.data.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetch(); }, [fetch]);

  return { visits, total, loading, error, refetch: fetch };
}

export function useVisitDetail(id: string | undefined) {
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    officerApi.getVisit(id)
      .then(res => setVisit(res.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load visit'))
      .finally(() => setLoading(false));
  }, [id]);

  return { visit, loading, error };
}

export function useGpsVerification() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ gpsMatch: boolean; distanceMeters: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (visitId: string) => {
    setVerifying(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
      });
      const res = await officerApi.startVisit(visitId, pos.coords.latitude, pos.coords.longitude);
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.message || 'GPS verification failed');
    } finally {
      setVerifying(false);
    }
  }, []);

  return { verifying, result, error, verify };
}

export function useInspectionSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (visitId: string, data: InspectionFormData) => {
    setSubmitting(true);
    setError(null);
    try {
      await officerApi.submitVisit(visitId, data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, submitted, error, submit };
}

export function useAdminVisits() {
  const [visits, setVisits] = useState<AdminVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminVisitApi.getVisits();
      const payload = (res.data as any)?.data;
      setVisits(Array.isArray(payload) ? payload : (payload as any)?.visits || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { visits, loading, error, refetch: fetch };
}

export function useDisasterMode() {
  const [disaster, setDisaster] = useState<DisasterEventActive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await disasterApi.getActive();
      setDisaster(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load disaster status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const declare = useCallback(async (data: Parameters<typeof disasterApi.declare>[0]) => {
    const res = await disasterApi.declare(data);
    await fetch();
    return res.data.data;
  }, [fetch]);

  const deactivate = useCallback(async (id: string) => {
    await disasterApi.deactivate(id);
    await fetch();
  }, [fetch]);

  return { disaster, loading, error, declare, deactivate, refetch: fetch };
}
