import { useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceHealthPill from '../ui/ServiceHealthPill';
import type { ServiceHealth } from '../../types';

interface TopBarProps {
  title: string;
  services?: ServiceHealth[];
  showServiceStatus?: boolean;
  onRefresh?: () => void;
}

export default function TopBar({
  title,
  services = [],
  showServiceStatus = false,
  onRefresh,
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/5">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>

        <div className="flex items-center gap-4">
          {showServiceStatus && services.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
              {services.slice(0, 5).map((service) => (
                <ServiceHealthPill
                  key={service.name}
                  name={service.name}
                  port={service.port}
                  status={service.status}
                  responseTime={service.responseTime}
                  lastChecked={service.lastChecked}
                />
              ))}
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-4 top-16 w-80 glass p-4 rounded-xl z-50"
          >
            <h4 className="font-medium text-white mb-3">Notifications</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <p className="text-center py-4">No new notifications</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}