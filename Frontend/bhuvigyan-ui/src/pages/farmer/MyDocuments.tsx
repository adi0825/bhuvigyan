import { useState, useEffect } from 'react';
import {
  FolderOpen, FileText, CheckCircle, X, Image as ImageIcon,
  Download, Eye
} from 'lucide-react';
import GovCard from '../../components/ui/GovCard';

function getRegData() {
  try { return JSON.parse(localStorage.getItem('farmerRegistration') || '{}'); } catch { return {}; }
}

const DOC_META: Record<string, { label: string; icon: typeof FileText }> = {
  aadhaar: { label: 'Aadhaar Card', icon: FileText },
  rtc: { label: 'RTC / Pahani Certificate', icon: FileText },
  bank: { label: 'Bank Passbook / Cancelled Cheque', icon: FileText },
  land: { label: 'Land Ownership Proof', icon: FileText },
  photo: { label: 'Recent Passport Photo', icon: ImageIcon },
};

export default function MyDocuments() {
  const [reg, setReg] = useState<any>({});

  useEffect(() => {
    setReg(getRegData());
  }, []);

  const docs = reg.docs || {};
  const allKeys = Object.keys(DOC_META);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#1a1a1a]">My Documents</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GovCard className="p-4 text-center">
          <p className="text-2xl font-bold text-[#1a6b3c]">{Object.keys(docs).length}</p>
          <p className="text-xs text-[#6b7280] mt-1">Uploaded</p>
        </GovCard>
        <GovCard className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{allKeys.length - Object.keys(docs).length}</p>
          <p className="text-xs text-[#6b7280] mt-1">Pending</p>
        </GovCard>
        <GovCard className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">0</p>
          <p className="text-xs text-[#6b7280] mt-1">Verified</p>
        </GovCard>
        <GovCard className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">0</p>
          <p className="text-xs text-[#6b7280] mt-1">Rejected</p>
        </GovCard>
      </div>

      {/* Document List */}
      <GovCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#1a6b3c]" /> Uploaded Documents
          </h3>
          <span className="text-xs text-[#6b7280]">{Object.keys(docs).length} of {allKeys.length}</span>
        </div>
        <div className="divide-y divide-[#f3f4f6]">
          {allKeys.map(key => {
            const meta = DOC_META[key];
            const uploaded = docs[key];
            const Icon = meta.icon;
            return (
              <div key={key} className={`p-4 flex items-center gap-3 ${uploaded ? 'bg-green-50/30' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {uploaded ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${uploaded ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>{meta.label}</p>
                  {uploaded ? (
                    <p className="text-xs text-green-700">{uploaded.name} · {uploaded.size}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Not uploaded</p>
                  )}
                </div>
                {uploaded && (
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {Object.keys(docs).length === 0 && (
          <div className="p-8 text-center">
            <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[#6b7280]">No documents uploaded yet.</p>
          </div>
        )}
      </GovCard>
    </div>
  );
}
