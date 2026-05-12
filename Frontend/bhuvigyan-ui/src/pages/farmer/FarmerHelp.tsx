import { useState } from 'react';
import { Phone, MessageCircle, BookOpen, ChevronRight, HelpCircle, Video, FileText } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import GovButton from '../../components/ui/GovButton';

const faqs = [
  { q: 'How do I file a new insurance claim?', a: 'Go to "My Claims" in the sidebar and click "New Claim". Fill in the loss details and upload photos. The system will auto-verify with satellite data.' },
  { q: 'What does the NDVI score mean?', a: 'NDVI measures vegetation health from 0 to 1. Below 0.3 indicates crop stress or damage, which helps validate your claim automatically.' },
  { q: 'How are carbon credits calculated?', a: 'Credits are estimated based on your land area, crop type, and sustainable practices verified via satellite. Enroll in the Carbon Credits page.' },
  { q: 'Why is my land record frozen?', a: 'A freeze may occur during fraud investigation or VAO review. Contact your CSC operator or use the Support button in the sidebar.' },
  { q: 'How long does claim approval take?', a: 'Most claims are processed within 14 days. Claims with strong satellite evidence and low fraud scores may be auto-approved sooner.' },
];

export default function FarmerHelp() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-5 max-w-5xl">
      <h2 className="text-[20px] font-extrabold text-[#111827]">Help & Support</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <GovCard className="p-4 border border-[#E5E7EB] text-center">
          <Phone size={24} className="mx-auto text-[#016B4B] mb-2" />
          <p className="text-[13px] font-bold text-[#111827]">Call Support</p>
          <p className="text-[12px] text-[#6B7280]">1800-180-1551 (Toll-free)</p>
        </GovCard>
        <GovCard className="p-4 border border-[#E5E7EB] text-center">
          <MessageCircle size={24} className="mx-auto text-[#016B4B] mb-2" />
          <p className="text-[13px] font-bold text-[#111827]">WhatsApp</p>
          <p className="text-[12px] text-[#6B7280]">+91-98765-43210</p>
        </GovCard>
        <GovCard className="p-4 border border-[#E5E7EB] text-center">
          <Video size={24} className="mx-auto text-[#016B4B] mb-2" />
          <p className="text-[13px] font-bold text-[#111827]">Video Tutorials</p>
          <p className="text-[12px] text-[#6B7280]">youtube.com/bhuvigyan</p>
        </GovCard>
      </div>

      <GovCard className="p-5 border border-[#E5E7EB]">
        <h3 className="font-bold text-[15px] text-[#111827] mb-4 flex items-center gap-2">
          <HelpCircle size={18} className="text-[#016B4B]" /> Frequently Asked Questions
        </h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#F3F4F6] rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-[#F9FAFB] transition-colors"
              >
                <span className="text-[13px] font-bold text-[#111827]">{faq.q}</span>
                <ChevronRight size={16} className={`text-[#9CA3AF] transition-transform ${openIdx === i ? 'rotate-90' : ''}`} />
              </button>
              {openIdx === i && (
                <div className="px-3 pb-3 text-[12px] text-[#374151] leading-relaxed border-t border-[#F3F4F6] pt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </GovCard>

      <GovCard className="p-5 border border-[#E5E7EB]">
        <h3 className="font-bold text-[15px] text-[#111827] mb-3 flex items-center gap-2">
          <FileText size={18} className="text-[#016B4B]" /> Quick Guides
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <GovButton variant="outline" className="justify-start text-left h-auto py-3">
            <BookOpen size={16} className="mr-2 shrink-0" /> How to read satellite data
          </GovButton>
          <GovButton variant="outline" className="justify-start text-left h-auto py-3">
            <BookOpen size={16} className="mr-2 shrink-0" /> Understanding claim statuses
          </GovButton>
          <GovButton variant="outline" className="justify-start text-left h-auto py-3">
            <BookOpen size={16} className="mr-2 shrink-0" /> Carbon credit best practices
          </GovButton>
          <GovButton variant="outline" className="justify-start text-left h-auto py-3">
            <BookOpen size={16} className="mr-2 shrink-0" /> Aadhaar-land linking guide
          </GovButton>
        </div>
      </GovCard>
    </div>
  );
}
