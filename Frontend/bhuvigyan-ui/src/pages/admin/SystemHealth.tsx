import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Info, Database } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import StatusBadge from '../../components/ui/StatusBadge';
import TopBar from '../../components/layout/TopBar';
import { systemApi } from '../../api/system';
import type { ServiceHealth, SystemMode } from '../../types';
import PageTransition from '../../components/ui/PageTransition';

export default function SystemHealth() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [systemMode, setSystemMode] = useState<SystemMode | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const now = new Date().toLocaleTimeString();
      const results = await Promise.allSettled([
        systemApi.healthGateway(),
        systemApi.healthFarmer(),
        systemApi.healthClaims(),
      ]);

      const updated = results.map((result, i) => {
        const names = ['Gateway', 'Farmer Service', 'Claims Service'];
        const ports = [8080, 8081, 8083];
        return {
          name: names[i],
          port: ports[i],
          url: '',
          status: result.status === 'fulfilled' ? 'UP' as const : 'DOWN' as const,
          responseTime: 0,
          lastChecked: now,
        };
      });

      setServices(updated);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMode = async () => {
    try {
      const response = await systemApi.getMode();
      setSystemMode(response.data);
    } catch {
      setSystemMode({ mode: 'LOCAL' });
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchMode();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const logs = [
    { level: 'INFO', time: '10:23:01', message: 'Farmer login: 990000001' },
    { level: 'WARN', time: '10:24:15', message: 'High fraud score detected: C-2024-0042' },
    { level: 'INFO', time: '10:25:00', message: 'Claim approved: C-2024-0041' },
    { level: 'ERROR', time: '10:26:30', message: 'Redis timeout (recovered)' },
    { level: 'INFO', time: '10:27:00', message: 'Carbon enrolment: farmer_123' },
  ];

  return (
    <PageTransition>
      <TopBar title="System Health" />

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            Last checked: {new Date().toLocaleTimeString()}
          </p>
          <GovButton variant="outline" size="sm" onClick={fetchHealth}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </GovButton>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <GovCard key={service.name} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      service.status === 'UP'
                        ? 'bg-[#16a34a] animate-pulse'
                        : service.status === 'DOWN'
                        ? 'bg-[#dc2626]'
                        : 'bg-[#9ca3af]'
                    }`}
                  />
                  <div>
                    <p className="text-[#1a1a1a] font-medium">{service.name}</p>
                    <p className="text-[#6b7280] text-xs">:{service.port}</p>
                  </div>
                </div>
                <StatusBadge status={service.status} />
              </div>
              <div className="flex items-center justify-between text-xs text-[#6b7280]">
                <span>Response: {service.responseTime}ms</span>
                <span>{service.lastChecked}</span>
              </div>
            </GovCard>
          ))}
        </div>

        <GovCard className="p-6">
          <h3 className="text-[#1a1a1a] font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#1a6b3c]" />
            System Information
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Run Mode</p>
              <p className="text-[#1a1a1a] font-medium">{systemMode?.mode || 'UNKNOWN'}</p>
            </div>
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Database</p>
              <p className="text-[#1a6b3c] font-medium flex items-center gap-1">
                <Database className="w-4 h-4" />
                Connected
              </p>
            </div>
            <div>
              <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Uptime</p>
              <p className="text-[#1a1a1a] font-medium">
                {systemMode?.uptime ? `${Math.floor(systemMode.uptime / 3600)}h` : 'N/A'}
              </p>
            </div>
          </div>
        </GovCard>

        <GovCard className="p-6">
          <h3 className="text-[#1a1a1a] font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1a6b3c]" />
            System Logs
          </h3>
          <div className="space-y-2 font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 py-1"
              >
                <span className="text-[#6b7280]">[{log.time}]</span>
                <span
                  className={
                    log.level === 'INFO'
                      ? 'text-[#1a6b3c]'
                      : log.level === 'WARN'
                      ? 'text-amber-400'
                      : 'text-[#dc2626]'
                  }
                >
                  [{log.level}]
                </span>
                <span className="text-[#374151]">{log.message}</span>
              </motion.div>
            ))}
          </div>
        </GovCard>
      </div>
    </PageTransition>
  );
}