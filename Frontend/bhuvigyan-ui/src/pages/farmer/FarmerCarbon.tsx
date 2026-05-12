import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, CheckCircle, AlertCircle, Info, ChevronRight, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';
import StatusBadge from '../../components/ui/StatusBadge';
import CountUpNumber from '../../components/ui/CountUpNumber';
import NdviChart from '../../components/charts/NdviChart';
import { useFarmerData } from '../../hooks/useFarmerData';
import { farmerApi } from '../../api/farmer';
import PageTransition from '../../components/ui/PageTransition';

const practices = [
  {
    value: 'PADDY_STRAW_MANAGEMENT',
    label: 'Paddy Straw Management',
    description: 'Avoid burning, compost straw to enrich soil carbon.',
    incentive: '₹2,400/Ha',
    difficulty: 'Easy',
  },
  {
    value: 'ZERO_TILLAGE',
    label: 'Zero Tillage',
    description: 'Direct seeding without tilling reduces soil carbon loss.',
    incentive: '₹1,800/Ha',
    difficulty: 'Medium',
  },
  {
    value: 'COVER_CROPPING',
    label: 'Cover Cropping',
    description: 'Planting off-season crops to maintain soil health.',
    incentive: '₹1,200/Ha',
    difficulty: 'Easy',
  },
  {
    value: 'WATER_MANAGEMENT',
    label: 'Water Management',
    description: 'Alternate wetting and drying (AWD) reduces methane.',
    incentive: '₹2,000/Ha',
    difficulty: 'Hard',
  },
];

export default function FarmerCarbon() {
  const { land, carbon, loading, refetch } = useFarmerData();
  const [selectedPractice, setSelectedPractice] = useState<string>('');
  const [enrolling, setEnrolling] = useState(false);

  const eligibilityChecks = [
    { label: 'Land area ≥ 0.5 Ha', pass: (land?.landAreaHa || 0) >= 0.5 },
    { label: 'Active crop declared', pass: !!land?.declaredCrop },
    { label: 'Land not frozen', pass: !land?.isFrozen },
    { label: 'Satellite NDVI Verified', pass: true },
  ];

  const isEligible = eligibilityChecks.every((c) => c.pass);

  const handleEnrol = async () => {
    if (!selectedPractice) {
      toast.error('Please select a sustainable practice');
      return;
    }

    setEnrolling(true);
    try {
      await farmerApi.enrolCarbon({ practiceType: selectedPractice as any, udlrn: land?.udlrn || '' });
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1a6b3c', '#22c55e', '#ffffff']
      });
      toast.success('🌱 Enrolment Successful!');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to enrol');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* HERO HEADER */}
        <GovCard topBorder="green" className="p-8 bg-gradient-to-br from-white to-[#f0fdf4]">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#f0fdf4] text-[#1a6b3c] rounded-full flex items-center justify-center border border-[#bbf7d0]">
                  <Leaf size={24} />
                </div>
                <h1 className="text-[28px] font-black text-[#1a1a1a]">Carbon Programme</h1>
              </div>
              <p className="text-[#6b7280] text-[15px] leading-relaxed max-w-xl">
                Earn additional income by adopting climate-smart farming practices. 
                Your contribution to reducing emissions is verified via high-resolution satellite imagery.
              </p>
              
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm min-w-[160px]">
                  <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Estimated Credits</p>
                  <p className="text-[24px] font-black text-[#1a6b3c]">
                    <CountUpNumber end={carbon?.estimatedCredits || 0} />
                    <span className="text-[14px] font-bold text-[#6b7280] ml-1">tCO2e</span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm min-w-[160px]">
                  <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Expected Payout</p>
                  <p className="text-[24px] font-black text-[#1a1a1a]">
                    ₹ <CountUpNumber end={(carbon?.estimatedCredits || 0) * 1250} />
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-[6px] border-[#f0fdf4] flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-[6px] border-[#1a6b3c] border-t-transparent animate-spin-slow absolute inset-0" />
                  <span className="text-[32px] font-black text-[#1a6b3c]">{land?.carbonScore || 0}%</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-[#1a6b3c] text-white p-1.5 rounded-full border-4 border-white shadow-lg">
                  <CheckCircle size={18} />
                </div>
              </div>
              <p className="text-[11px] font-bold text-[#6b7280] mt-4 uppercase tracking-widest">Sustainability Score</p>
            </div>
          </div>
        </GovCard>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ELIGIBILITY SECTION */}
          <GovCard className="lg:col-span-1 p-6">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
              <CheckCircle size={18} className="text-primary" />
              Eligibility Checklist
            </h3>
            <div className="space-y-4">
              {eligibilityChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between">
                  <span className="text-[14px] text-[#4b5563] font-medium">{check.label}</span>
                  {check.pass ? (
                    <StatusBadge status="APPROVED" />
                  ) : (
                    <StatusBadge status="REJECTED" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-[#f9fafb] rounded-xl border border-[#f3f4f6]">
              <div className="flex gap-3">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#6b7280] leading-relaxed">
                  Calculated based on your verified UDLRN record and satellite baseline analysis.
                </p>
              </div>
            </div>
          </GovCard>

          {/* NDVI TIMELINE SECTION */}
          <GovCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[16px] font-bold text-[#1a1a1a] flex items-center gap-2">
                <AlertCircle size={18} className="text-[#3b82f6]" />
                Verification Pipeline (NDVI)
              </h3>
              <GovButton variant="ghost" size="sm" className="text-primary font-bold">
                Download Report
              </GovButton>
            </div>
            <div className="h-[250px]">
              <NdviChart data={carbon?.monthlyNdvi || []} height={250} />
            </div>
          </GovCard>
        </div>

        {/* ENROLMENT SECTION */}
        {!carbon?.enrolled ? (
          <GovCard topBorder="blue" className="p-0 overflow-hidden">
            <div className="px-8 py-6 border-b border-[#e5e7eb] bg-[#f9fafb]">
              <h3 className="text-[18px] font-bold text-[#1a1a1a]">Select Sustainable Practice</h3>
              <p className="text-[13px] text-[#6b7280] mt-1">Choose one or more practices to begin earning credits.</p>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {practices.map((practice) => (
                  <div
                    key={practice.value}
                    onClick={() => setSelectedPractice(practice.value)}
                    className={`
                      p-5 rounded-2xl border-2 transition-all cursor-pointer group relative
                      ${selectedPractice === practice.value 
                        ? 'border-primary bg-[#f0fdf4] shadow-md' 
                        : 'border-[#e5e7eb] hover:border-[#d1d5db] bg-white'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-[#f9fafb] group-hover:bg-white rounded-lg transition-colors">
                        <Leaf size={20} className={selectedPractice === practice.value ? 'text-primary' : 'text-[#9ca3af]'} />
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        practice.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        practice.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {practice.difficulty}
                      </span>
                    </div>
                    <h4 className="text-[15px] font-bold text-[#1a1a1a] mb-1">{practice.label}</h4>
                    <p className="text-[12px] text-[#6b7280] leading-relaxed mb-4">{practice.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-black text-primary">{practice.incentive}</p>
                      {selectedPractice === practice.value && (
                        <CheckCircle size={20} className="text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-[#f8fafc] rounded-2xl border border-[#e5e7eb]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e7eb]">
                    <Info className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#1a1a1a]">Final Verification Notice</p>
                    <p className="text-[12px] text-[#6b7280]">By enrolling, you agree to satellite monitoring for the next 120 days.</p>
                  </div>
                </div>
                <GovButton 
                  variant="primary" 
                  size="lg" 
                  className="px-10 min-w-[200px]"
                  onClick={handleEnrol}
                  loading={enrolling}
                  disabled={!isEligible || !selectedPractice}
                >
                  Enrol Now
                  <ChevronRight size={18} />
                </GovButton>
              </div>
            </div>
          </GovCard>
        ) : (
          <GovCard topBorder="green" className="p-8">
            <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
              <div className="w-20 h-20 bg-[#f0fdf4] text-[#1a6b3c] rounded-full flex items-center justify-center shadow-inner mb-2">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-[22px] font-black text-[#1a1a1a]">You are Enrolled!</h3>
              <p className="text-[15px] text-[#6b7280] leading-relaxed">
                Your farming plot is currently being monitored for <strong>{carbon.practiceType?.replace(/_/g, ' ')}</strong>. 
                Next credit issuance is expected in <strong>September 2026</strong>.
              </p>
              <div className="flex gap-3 mt-4">
                <GovButton variant="outline">
                  <Download size={16} />
                  Certificate
                </GovButton>
                <GovButton variant="outline">
                  <Share2 size={16} />
                  Share Impact
                </GovButton>
              </div>
            </div>
          </GovCard>
        )}
      </div>
    </PageTransition>
  );
}