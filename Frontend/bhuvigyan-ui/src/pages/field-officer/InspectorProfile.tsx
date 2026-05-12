import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, BadgeCheck, Loader2, Shield } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import { useAuth } from '../../auth/AuthContext';

interface InspectorProfileData {
  fullName: string;
  email: string;
  employeeId: string;
  designation: string;
  district: string;
  mobile: string;
  role: string;
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  agreementScore: number;
}

export default function InspectorProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<InspectorProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production this would fetch from /officer/profile
    setTimeout(() => {
      setProfile({
        fullName: user?.fullName || 'Inspector Kumar',
        email: user?.email || 'inspector.ka@bhuvigyan.gov.in',
        employeeId: 'EMP-KA-0001',
        designation: 'Field Officer',
        district: 'Bengaluru Rural',
        mobile: '9900000008',
        role: 'FIELD_OFFICER',
        totalVisits: 47,
        completedVisits: 42,
        pendingVisits: 5,
        agreementScore: 91.5,
      });
      setLoading(false);
    }, 500);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">Profile</h1>

      <GovCard className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#1a6b3c] text-white flex items-center justify-center text-2xl font-bold">
          {profile.fullName.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile.fullName}</h2>
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <BadgeCheck className="w-4 h-4 text-[#1a6b3c]" />
            <span>{profile.designation}</span>
            <span className="text-[#d1d5db]">|</span>
            <Shield className="w-4 h-4 text-[#1a6b3c]" />
            <span>{profile.role}</span>
          </div>
        </div>
      </GovCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GovCard>
          <h3 className="font-semibold text-[#1a1a1a] mb-3">Personal Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#6b7280]" />
              <span className="text-[#6b7280]">Email</span>
              <span className="ml-auto font-medium">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#6b7280]" />
              <span className="text-[#6b7280]">Mobile</span>
              <span className="ml-auto font-medium">{profile.mobile}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#6b7280]" />
              <span className="text-[#6b7280]">District</span>
              <span className="ml-auto font-medium">{profile.district}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#6b7280]" />
              <span className="text-[#6b7280]">Employee ID</span>
              <span className="ml-auto font-medium">{profile.employeeId}</span>
            </div>
          </div>
        </GovCard>

        <GovCard>
          <h3 className="font-semibold text-[#1a1a1a] mb-3">Performance</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Total Visits</span>
              <span className="font-bold text-[#1a1a1a]">{profile.totalVisits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Completed</span>
              <span className="font-bold text-[#22c55e]">{profile.completedVisits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Pending</span>
              <span className="font-bold text-[#f59e0b]">{profile.pendingVisits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Satellite Agreement</span>
              <span className="font-bold text-[#1a6b3c]">{profile.agreementScore}%</span>
            </div>
          </div>
        </GovCard>
      </div>
    </div>
  );
}
