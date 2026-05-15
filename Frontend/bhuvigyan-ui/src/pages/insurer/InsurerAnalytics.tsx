import { useEffect, useState } from 'react';
import { BarChart3, FileDown } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { insurerApi } from '../../api/insurerApi';

export default function InsurerAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insurerApi.getAnalytics().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="p-8 text-center">Failed to load analytics</div>;

  const maxStateCount = Math.max(...data.claimsByState.map((s: any) => s.count), 1);
  const maxFraudCount = Math.max(...data.fraudScoreDistribution.map((f: any) => f.count), 1);
  const maxPayout = Math.max(...data.monthlyPayouts.map((m: any) => m.amount), 1);
  const maxMonthTotal = Math.max(...data.approvalRejectionByMonth.map((m: any) => m.approved + m.rejected + m.review), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Analytics</h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Claims by State */}
        <GovCard className="p-5">
          <h3 className="font-bold mb-4">Claims by State</h3>
          <div className="space-y-2">
            {data.claimsByState.map((s: any) => (
              <div key={s.state}>
                <div className="flex justify-between text-xs mb-0.5"><span>{s.state}</span><span>{s.count}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width:`${(s.count/maxStateCount)*100}%`}} /></div>
              </div>
            ))}
          </div>
        </GovCard>

        {/* Fraud Score Distribution */}
        <GovCard className="p-5">
          <h3 className="font-bold mb-4">Fraud Score Distribution</h3>
          <div className="flex items-end gap-1 h-40">
            {data.fraudScoreDistribution.map((f: any, i: number) => {
              const pct = (f.count / maxFraudCount) * 100;
              const color = i < 3 ? 'bg-green-500' : i < 6 ? 'bg-yellow-500' : i < 8 ? 'bg-orange-500' : 'bg-red-500';
              return (
                <div key={f.range} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full ${color} rounded-t`} style={{height:`${Math.max(pct, 5)}%`}} />
                  <span className="text-[10px] text-gray-500 rotate-45 origin-left translate-y-2">{f.range}</span>
                </div>
              );
            })}
          </div>
        </GovCard>

        {/* Monthly Payouts */}
        <GovCard className="p-5">
          <h3 className="font-bold mb-4">Monthly Payout Trend</h3>
          <div className="flex items-end gap-2 h-40">
            {data.monthlyPayouts.map((m: any) => {
              const pct = maxPayout > 0 ? (m.amount / maxPayout) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-[#f9a825] rounded-t" style={{height:`${Math.max(pct, 5)}%`}} />
                  <span className="text-[10px] text-gray-500">{m.month}</span>
                </div>
              );
            })}
          </div>
        </GovCard>

        {/* Approval vs Rejection */}
        <GovCard className="p-5">
          <h3 className="font-bold mb-4">Approval vs Rejection</h3>
          <div className="flex items-end gap-2 h-40">
            {data.approvalRejectionByMonth.map((m: any) => {
              const total = m.approved + m.rejected + m.review;
              const h = maxMonthTotal > 0 ? (total / maxMonthTotal) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse rounded overflow-hidden" style={{height:`${Math.max(h, 5)}%`}}>
                    <div className="bg-green-500" style={{height:`${(m.approved/total)*100}%`}} />
                    <div className="bg-red-500" style={{height:`${(m.rejected/total)*100}%`}} />
                    <div className="bg-yellow-500" style={{height:`${(m.review/total)*100}%`}} />
                  </div>
                  <span className="text-[10px] text-gray-500">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Approved</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /> Rejected</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded" /> Review</span>
          </div>
        </GovCard>
      </div>

      <div className="flex justify-end">
        <GovButton variant="outline"><FileDown className="w-4 h-4" /> Download Report</GovButton>
      </div>
    </div>
  );
}
