import { useState, useEffect, useCallback } from 'react';
import { systemApi, defaultServices } from '../api/system';
import type { ServiceHealth } from '../types';

export function useServiceHealth() {
  const [services, setServices] = useState<ServiceHealth[]>(defaultServices);
  const [isLoading, setIsLoading] = useState(true);

  const checkServices = useCallback(async () => {
    setIsLoading(true);
    const now = new Date().toISOString();

    const checks = await Promise.allSettled([
      systemApi.healthAdmin(),
      systemApi.healthPostgres(),
      systemApi.healthSatellite(),
      systemApi.healthFraud(),
      systemApi.healthCCE(),
      systemApi.healthLocation(),
    ]);

    const updatedServices = [...defaultServices];
    const healthResults = checks.map((result) => {
      if (result.status === 'fulfilled' && result.value) {
        return { status: result.value.status || 'UP' as const, responseTime: result.value.responseTime || 0, lastChecked: now };
      }
      return { status: 'DOWN' as const, responseTime: 0, lastChecked: now };
    });

    healthResults.forEach((result, index) => {
      if (index < updatedServices.length) {
        updatedServices[index] = {
          ...updatedServices[index],
          status: result.status,
          responseTime: result.responseTime,
          lastChecked: result.lastChecked,
        };
      }
    });

    setServices(updatedServices);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, [checkServices]);

  return { services, isLoading, refetch: checkServices };
}
