import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, ArrowLeft, Sprout, MapPin, ShieldCheck,
  Satellite, Droplets, AlertTriangle, TrendingUp, Calendar, CheckCircle
} from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import { useAuth } from '../../auth/AuthContext';
import { farmerApi } from '../../api/farmer';
import api from '../../api/axios';

function getRegData() {
  try { return JSON.parse(localStorage.getItem('farmerRegistration') || '{}'); } catch { return {}; }
}

export default function Reports() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [reg, setReg] = useState<any>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setReg(getRegData());
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await farmerApi.getProfile();
      setProfile(res.data);
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Call backend report endpoint to get PDF
      const udlrm = reg.udlrmNumber || reg.udlrm;
      if (udlrm) {
        const res = await api.get(`/farmer/report/${udlrm}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `PMFBY_Report_${udlrm}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Report download failed. Please try again later.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a6b3c]"></div>
      </div>
    );
  }

  const landData = profile?.landData || reg.landData || null;
  const udlrm = reg.udlrmNumber || reg.udlrm || '—';

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => nav('/farmer-dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Farmer Report</h1>
          <p className="text-sm text-[#6b7280]">Complete land and satellite verification report</p>
        </div>
      </div>

      {/* Section 1: Basic Information */}
      <GovCard className="p-5">
        <h3 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#1a6b3c]" /> Basic Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">UDLRM Number</p>
            <p className="font-bold text-[#1a1a1a] font-mono">{udlrm}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Farmer Name</p>
            <p className="font-bold text-[#1a1a1a]">{profile?.fullName || reg.fullName || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Mobile</p>
            <p className="font-bold text-[#1a1a1a]">{profile?.mobile || reg.mobile || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">State</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.state || profile?.district || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">District</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.district || profile?.district || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Village</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.village || profile?.village || '—'}</p>
          </div>
        </div>
      </GovCard>

      {/* Section 2: Satellite Data */}
      <GovCard className="p-5">
        <h3 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <Satellite className="w-5 h-5 text-blue-600" /> Satellite Data
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">NDVI</p>
            <p className="font-bold text-green-700">{landData?.ndvi?.toFixed(2) || '—'}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Crop Health</p>
            <p className="font-bold text-green-700">{landData?.cropHealth || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Crop Type</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.cropType || '—'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Soil Moisture</p>
            <p className="font-bold text-blue-700">{landData?.soilMoisture ? `${landData.soilMoisture}%` : '—'}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Fraud Risk</p>
            <p className="font-bold text-amber-700">{landData?.fraudScore ? `${landData.fraudScore}/100` : '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Last Satellite Date</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.lastSatelliteDate ? new Date(landData.lastSatelliteDate).toLocaleDateString() : '—'}</p>
          </div>
        </div>
      </GovCard>

      {/* Section 3: Land Record Details */}
      <GovCard className="p-5">
        <h3 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#1a6b3c]" /> Land Record Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Survey No</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.surveyNo || '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Land Area</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.area ? `${(landData.area * 2.47105).toFixed(2)} ac (${landData.area} ha)` : '—'}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Land Use</p>
            <p className="font-bold text-[#1a1a1a]">{landData?.landUse || '—'}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">RTC Status</p>
            <p className="font-bold text-green-700">{landData?.rtcStatus || '—'}</p>
          </div>
        </div>
      </GovCard>

      {/* Verification Status */}
      <GovCard className="p-5">
        <h3 className="text-base font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#1a6b3c]" /> Verification Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800">Coordinates Verified via Satellite</p>
              <p className="text-xs text-green-700">GPS coordinates matched with satellite imagery</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Satellite className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold text-blue-800">Satellite Analysis Complete</p>
              <p className="text-xs text-blue-700">NDVI, crop health, and fraud analysis performed</p>
            </div>
          </div>
        </div>
      </GovCard>

      {/* Download Button */}
      <div className="flex justify-end">
        <GovButton variant="primary" onClick={handleDownloadPDF} disabled={downloading}>
          <Download className="w-4 h-4 mr-2" />
          {downloading ? 'Downloading...' : 'Download PDF Report'}
        </GovButton>
      </div>
    </div>
  );
}
