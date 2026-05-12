import { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, Users, FileText } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import TopBar from '../../components/layout/TopBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import PageTransition from '../../components/ui/PageTransition';

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [stats, setStats] = useState<any>(null);
  const [fraudTrend, setFraudTrend] = useState<any[]>([]);
  const [districtHeatmap, setDistrictHeatmap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, districtRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/reports/fraud-trend'),
        api.get('/reports/district-heatmap'),
      ]);
      setStats((statsRes.data as any)?.data || {});
      setFraudTrend((trendRes.data as any)?.data || []);
      setDistrictHeatmap((districtRes.data as any)?.data || []);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const claimsData = fraudTrend.map((d: any) => ({ date: d.date, filed: d.claimCount, approved: Math.round(d.claimCount * 0.8) }));
  const districtData = districtHeatmap.slice(0, 8).map((d: any) => ({ name: d.district, claims: d.claimCount, score: Math.round(d.avgScore || 0) }));

  return (
    <PageTransition>
      <TopBar title="Analytics" />

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((range) => (
              <GovButton
                key={range}
                variant={dateRange === range ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                <Calendar size={14} />
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </GovButton>
            ))}
          </div>
          <GovButton variant="outline" size="sm">
            <Download size={14} />
            Export CSV
          </GovButton>
        </div>

        {loading && <div className="text-center py-12 text-gray-500">Loading analytics...</div>}

        {!loading && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <GovCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalFarmers ?? 0}</p>
                    <p className="text-xs text-gray-500">Total Farmers</p>
                  </div>
                </div>
              </GovCard>
              <GovCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.activeClaims ?? 0}</p>
                    <p className="text-xs text-gray-500">Active Claims</p>
                  </div>
                </div>
              </GovCard>
              <GovCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.autoApproved ?? 0}</p>
                    <p className="text-xs text-gray-500">Auto Approved</p>
                  </div>
                </div>
              </GovCard>
              <GovCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.autoRejected ?? 0}</p>
                    <p className="text-xs text-gray-500">Auto Rejected</p>
                  </div>
                </div>
              </GovCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GovCard className="p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  Fraud Trend (Avg Score)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={fraudTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgScore" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              </GovCard>

              <GovCard className="p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Daily Claims
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={claimsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="filed" stroke="#3b82f6" fill="#dbeafe" />
                    <Area type="monotone" dataKey="approved" stroke="#22c55e" fill="#dcfce7" />
                  </AreaChart>
                </ResponsiveContainer>
              </GovCard>

              <GovCard className="p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-600" />
                  District Claim Heatmap
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={districtData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="claims" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GovCard>

              <GovCard className="p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-green-600" />
                  District Fraud Scores
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={districtData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GovCard>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}