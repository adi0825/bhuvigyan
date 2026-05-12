import { useState, useEffect } from 'react';
import { Download, FileText, Image, BarChart3 } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { farmerApi } from '../../api/farmer';

interface ReportItem {
  id: string;
  title: string;
  type: 'CLAIM' | 'INSPECTION' | 'SATELLITE' | 'CARBON';
  createdAt: string;
  format: string;
  url: string;
}

const typeIcon: Record<string, any> = {
  CLAIM: FileText,
  INSPECTION: FileText,
  SATELLITE: Image,
  CARBON: BarChart3,
};

const typeColor: Record<string, string> = {
  CLAIM: 'bg-[#F0FAF5] text-[#016B4B]',
  INSPECTION: 'bg-[#EFF6FF] text-[#3B82F6]',
  SATELLITE: 'bg-[#F5F3FF] text-[#8B5CF6]',
  CARBON: 'bg-[#F0FAF5] text-[#16A34A]',
};

export default function FarmerReports() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await farmerApi.getReports();
        setReports((res as any).data?.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <SkeletonLoader key={i} variant="rect" height={72} />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <h2 className="text-[20px] font-extrabold text-[#111827]">My Reports</h2>
      <p className="text-[13px] text-[#6B7280]">Downloadable PDF reports for claims, inspections, and satellite analysis.</p>

      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" message="Reports will appear here after claims are processed or inspections are completed." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const Icon = typeIcon[report.type] || FileText;
            return (
              <GovCard key={report.id} className="p-4 flex items-center justify-between border border-[#E5E7EB]">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColor[report.type]}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">{report.title}</p>
                    <p className="text-[12px] text-[#6B7280]">{report.type} · {new Date(report.createdAt).toLocaleDateString()} · {report.format}</p>
                  </div>
                </div>
                <GovButton variant="outline" size="sm" onClick={() => window.open(report.url, '_blank')}>
                  <Download size={14} className="mr-1" /> Download
                </GovButton>
              </GovCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
