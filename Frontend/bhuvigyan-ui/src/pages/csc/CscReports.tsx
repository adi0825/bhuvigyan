import { useEffect, useState } from 'react';
import { BarChart3, FileDown, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import { cscApi } from '../../api/cscApi';

export default function CscReports() {
  const [stats, setStats] = useState({ todayCount: 0, autoApprovedToday: 0, underReview: 0, rejectedToday: 0, dailyLimit: 50, remaining: 50 });

  useEffect(() => {
    cscApi.getDailyCount().then(res => {
      setStats(res.data.data);
    }).catch(() => {});
  }, []);

  const approvalRate = stats.todayCount > 0 ? Math.round((stats.autoApprovedToday / stats.todayCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Reports</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GovCard className="p-4 text-center">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <p className="text-2xl font-bold">{stats.todayCount}</p>
          <p className="text-xs text-gray-500">Claims Today</p>
        </GovCard>
        <GovCard className="p-4 text-center">
          <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold">{stats.autoApprovedToday}</p>
          <p className="text-xs text-gray-500">Auto Approved</p>
        </GovCard>
        <GovCard className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
          <p className="text-2xl font-bold">{stats.underReview}</p>
          <p className="text-xs text-gray-500">Under Review</p>
        </GovCard>
        <GovCard className="p-4 text-center">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold">{stats.rejectedToday}</p>
          <p className="text-xs text-gray-500">Rejected</p>
        </GovCard>
      </div>

      <GovCard className="p-6">
        <h3 className="font-bold mb-4">Performance Summary</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Approval Rate</span><span>{approvalRate}%</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width:`${approvalRate}%`}} /></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Daily Limit Usage</span><span>{stats.todayCount}/{stats.dailyLimit}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width:`${(stats.todayCount/stats.dailyLimit)*100}%`}} /></div>
          </div>
        </div>
      </GovCard>

      <div className="flex justify-end">
        <GovButton variant="outline"><FileDown className="w-4 h-4" /> Download Monthly Report</GovButton>
      </div>
    </div>
  );
}
