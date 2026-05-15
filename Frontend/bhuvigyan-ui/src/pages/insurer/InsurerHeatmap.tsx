import { useEffect, useState } from 'react';
import { Map, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import GovCard from '../../components/ui/GovCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { insurerApi } from '../../api/insurerApi';

export default function InsurerHeatmap() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    insurerApi.getHeatmapData().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load heatmap data');
      setLoading(false);
    });
  }, []);

  const colorFor = (avg: number) =>
    avg < 30 ? 'bg-green-500' : avg < 60 ? 'bg-yellow-500' : avg < 80 ? 'bg-orange-500' : 'bg-red-500';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><Map className="w-5 h-5" /> District Heatmap</h2>
      <GovCard className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.map(d => (
            <button key={d.district} onClick={() => setSelected(d)}
              className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${selected?.district === d.district ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${colorFor(d.avgFraudScore)}`} />
                <span className="font-bold text-sm truncate">{d.district}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Claims: {d.totalClaims}</p>
                <p>Avg Score: {d.avgFraudScore}</p>
                <p>Flagged: {d.flaggedClaims}</p>
              </div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold">{selected.district}, {selected.state}</h4>
            <p className="text-sm text-gray-700 mt-1">Total claims: {selected.totalClaims} | Avg fraud score: {selected.avgFraudScore} | Flagged: {selected.flaggedClaims}</p>
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /> Low (&lt;30)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500" /> Medium (30-60)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500" /> High (60-80)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /> Critical (&gt;80)</span>
        </div>
      </GovCard>
    </div>
  );
}
