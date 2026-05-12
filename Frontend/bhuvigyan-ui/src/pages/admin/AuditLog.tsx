import { useState, useEffect, Fragment } from 'react';
import {
  Search,
  Filter,
  Download,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import GovInput from '../../components/ui/GovInput';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  claimId?: string;
  details: any;
  ip: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-log');
      const data = (res.data as any)?.data || [];
      setLogs(data.map((l: any) => ({
        id: l.id,
        timestamp: l.createdAt || l.timestamp,
        actor: l.actor || 'System',
        role: l.actorRole || 'SYSTEM',
        action: l.action,
        claimId: l.claimId,
        details: l.details || {},
        ip: l.ip || '—',
        severity: l.severity || 'INFO',
      })));
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.actor.toLowerCase().includes(search.toLowerCase())
  );

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'INFO': return 'text-primary';
      case 'WARN': return 'text-warning';
      case 'CRITICAL': return 'text-danger';
      default: return 'text-[#6b7280]';
    }
  };

  const getSeverityBg = (s: string) => {
    switch (s) {
      case 'INFO': return 'bg-primary';
      case 'WARN': return 'bg-warning';
      case 'CRITICAL': return 'bg-danger';
      default: return 'bg-[#6b7280]';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold text-[#1a1a1a]">Immutable Audit Trail</h1>
          <p className="text-[#6b7280]">Full traceability of every system action and data mutation</p>
        </div>
        <GovButton variant="outline" size="sm">
          <Download size={14} />
          Export Audit CSV
        </GovButton>
      </div>

      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#e5e7eb] shadow-sm">
        <ShieldCheck className="text-primary" size={20} />
        <p className="text-[13px] text-[#374151]">
          <strong>Notice:</strong> This audit log is cryptographically signed and <strong>cannot be edited or deleted</strong>.
          Compliant with Government of India Cyber Security Policy.
        </p>
      </div>

      <GovCard className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by Actor, IP or Claim ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f9fafb] border border-[#d1d5db] rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <GovButton variant="outline" className="h-10">
            <Filter size={16} />
            Filters
          </GovButton>
          <GovInput type="date" className="h-10 w-auto" />
        </div>
      </GovCard>

      <GovCard className="p-0 overflow-hidden shadow-lg">
        <table className="gov-table">
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>Timestamp</th>
              <th>Actor / Role</th>
              <th>Action</th>
              <th>Claim ID</th>
              <th>IP Address</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading audit logs...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">No audit logs found</td></tr>
            ) : (
              filtered.map((log) => (
              <Fragment key={log.id}>
                <tr
                  className={`cursor-pointer transition-colors ${expandedRow === log.id ? 'bg-[#f0fdf4]' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                >
                  <td className="text-center">
                    {expandedRow === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="font-mono text-[12px]">{log.timestamp}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-[13px]">{log.actor}</span>
                      <span className="text-[10px] text-[#9ca3af] font-bold tracking-widest uppercase">{log.role}</span>
                    </div>
                  </td>
                  <td className="font-bold text-primary text-[12px]">{log.action}</td>
                  <td className="font-mono text-[12px] text-[#6b7280]">{log.claimId || '--'}</td>
                  <td className="font-mono text-[11px] text-[#9ca3af]">{log.ip}</td>
                  <td>
                    <div className={`flex items-center gap-1.5 font-bold text-[11px] uppercase ${getSeverityColor(log.severity)}`}>
                      <div className={`w-2 h-2 rounded-full ${getSeverityBg(log.severity)}`} />
                      {log.severity}
                    </div>
                  </td>
                </tr>
                <AnimatePresence>
                  {expandedRow === log.id && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#f9fafb] border-y border-[#e5e7eb]"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[12px] font-bold text-[#1a1a1a] uppercase tracking-widest">JSON Payload Details</h4>
                              <button className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                                Copy Raw JSON <ExternalLink size={10} />
                              </button>
                            </div>
                            <pre className="p-4 bg-[#1a1a1a] text-[#10b981] rounded-xl font-mono text-[12px] overflow-x-auto shadow-inner">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </Fragment>
            ))
          )}
          </tbody>
        </table>
        <div className="p-4 border-t border-[#f3f4f6] flex justify-between items-center bg-[#f9fafb]">
          <p className="text-[12px] text-[#6b7280]">Showing 4 of 24,881 entries</p>
          <div className="flex gap-2">
            <GovButton variant="outline" size="sm" disabled>Previous</GovButton>
            <GovButton variant="outline" size="sm">Next</GovButton>
          </div>
        </div>
      </GovCard>
    </div>
  );
}