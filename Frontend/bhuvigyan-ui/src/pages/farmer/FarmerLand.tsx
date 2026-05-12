import { useState, useEffect } from 'react';
import { MapPin, Ruler, Sprout, FileCheck, AlertCircle, Loader2 } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import EmptyState from '../../components/ui/EmptyState';
import { farmerApi } from '../../api/farmer';

interface LandRecord {
  udlrn: string;
  landAreaHa: number;
  declaredCrop: string;
  gpsLat: number;
  gpsLng: number;
  carbonScore: number;
  isFrozen: boolean;
  verified: boolean;
}

export default function FarmerLand() {
  const [land, setLand] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    farmerApi.getProfile()
      .then(r => {
        const p = r.data as any;
        if (p?.udlrn) {
          setLand({
            udlrn: p.udlrn,
            landAreaHa: p.landAreaHa || 2.5,
            declaredCrop: p.declaredCrop || 'PADDY',
            gpsLat: p.gpsLat || 13.1234,
            gpsLng: p.gpsLng || 77.5678,
            carbonScore: p.carbonScore || 100,
            isFrozen: p.isFrozen || false,
            verified: p.isVerified || false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  if (!land) {
    return (
      <EmptyState
        icon={MapPin}
        title="No land record found"
        message="Your land verification is pending. Please complete registration."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">My Land</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GovCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#d1fae5] flex items-center justify-center">
            <Ruler className="w-6 h-6 text-[#1a6b3c]" />
          </div>
          <div>
            <p className="text-sm text-[#6b7280]">Land Area</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{land.landAreaHa} ha</p>
          </div>
        </GovCard>

        <GovCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#dbeafe] flex items-center justify-center">
            <Sprout className="w-6 h-6 text-[#2563eb]" />
          </div>
          <div>
            <p className="text-sm text-[#6b7280]">Declared Crop</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{land.declaredCrop}</p>
          </div>
        </GovCard>

        <GovCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-[#d97706]" />
          </div>
          <div>
            <p className="text-sm text-[#6b7280]">Verification</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{land.verified ? 'Verified' : 'Pending'}</p>
          </div>
        </GovCard>
      </div>

      <GovCard>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-[#1a6b3c]" />
          <h2 className="text-lg font-bold">Land Location</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-[#f9fafb] p-3 rounded-lg">
            <p className="text-[#6b7280]">UDLRN</p>
            <p className="font-mono font-semibold">{land.udlrn}</p>
          </div>
          <div className="bg-[#f9fafb] p-3 rounded-lg">
            <p className="text-[#6b7280]">GPS Coordinates</p>
            <p className="font-mono font-semibold">{land.gpsLat.toFixed(4)}, {land.gpsLng.toFixed(4)}</p>
          </div>
        </div>
        <div className="mt-4 w-full h-64 bg-[#f3f4f6] rounded-lg flex items-center justify-center border border-[#e5e7eb]">
          <p className="text-[#9ca3af] text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Map view loads from satellite imagery service
          </p>
        </div>
      </GovCard>

      {land.isFrozen && (
        <GovCard className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-5 h-5" />
            <p className="font-semibold">Land record is frozen</p>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            A claim is currently active on this land. No new claims can be filed until resolution.
          </p>
        </GovCard>
      )}
    </div>
  );
}
