import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock, FileText, User, MapPin, Sprout, IndianRupee, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

interface PolicyApplication {
  applicationId: string;
  udlrn: string;
  farmerName: string;
  farmerMobile: string | null;
  requestedPlan: string;
  cropType: string;
  premium: number | null;
  sumInsured: number | null;
  landAreaHa: number | null;
  landVerified: boolean;
  status: string;
  submittedAt: string;
  insurerRemarks: string | null;
  rejectionReason: string | null;
}

export default function InsurerPolicyApplications() {
  const [applications, setApplications] = useState<PolicyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<PolicyApplication | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      setLoading(true);
      const res = await api.get('/insurer/policy-applications');
      if (res.data?.success) setApplications(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedApp) return;
    try {
      setActionLoading(true);
      const res = await api.post('/insurer/policy-approve', {
        applicationId: selectedApp.applicationId,
        policyNumber: policyNumber || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        remarks: remarks || undefined,
      });
      if (res.data?.success) {
        toast.success('Policy approved successfully');
        setShowDetail(false);
        setSelectedApp(null);
        loadApplications();
      } else {
        toast.error(res.data?.error?.message || 'Approval failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Error approving policy');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedApp || !remarks) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.post('/insurer/policy-reject', {
        applicationId: selectedApp.applicationId,
        reason: remarks,
      });
      if (res.data?.success) {
        toast.success('Application rejected');
        setShowDetail(false);
        setSelectedApp(null);
        loadApplications();
      } else {
        toast.error(res.data?.error?.message || 'Rejection failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Error rejecting application');
    } finally {
      setActionLoading(false);
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f9a825]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#111827]">Policy Applications</h1>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Shield className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No policy applications yet</p>
          <p className="text-sm text-gray-500 mt-1">Farmers will appear here once they apply for insurance.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Farmer</th>
                <th className="px-4 py-3 text-left font-medium">UDLRN</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Premium</th>
                <th className="px-4 py-3 text-left font-medium">Land Verified</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app) => (
                <tr key={app.applicationId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{app.farmerName}</div>
                    <div className="text-xs text-gray-500">{app.farmerMobile || '—'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{app.udlrn}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{app.requestedPlan}</div>
                    <div className="text-xs text-gray-500">{app.cropType}</div>
                  </td>
                  <td className="px-4 py-3">₹{app.premium?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3">
                    {app.landVerified ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" /> Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {app.status === 'PENDING' ? (
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setRemarks('');
                          setPolicyNumber('');
                          setStartDate('');
                          setEndDate('');
                          setShowDetail(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#f9a825] text-[#0d1b4b] text-xs font-medium hover:bg-[#e69500] transition-colors"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail/Review Modal */}
      {showDetail && selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Review Application</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedApp.applicationId}</p>

            <div className="space-y-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900 flex items-center gap-2"><User className="w-4 h-4" /> {selectedApp.farmerName}</p>
                <p className="text-gray-600 mt-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> UDLRN: {selectedApp.udlrn}</p>
                <p className="text-gray-600 flex items-center gap-2"><Sprout className="w-4 h-4" /> Crop: {selectedApp.cropType}</p>
                <p className="text-gray-600 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Premium: ₹{selectedApp.premium?.toLocaleString()} · Sum Insured: ₹{selectedApp.sumInsured?.toLocaleString()}</p>
                <p className="text-gray-600 flex items-center gap-2">Land Area: {selectedApp.landAreaHa} Ha · Verified: {selectedApp.landVerified ? 'Yes' : 'No'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number (optional)</label>
                <input type="text" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Auto-generated if empty" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f9a825] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f9a825] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f9a825] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Reason</label>
                <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks for approval or rejection..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f9a825] focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowDetail(false)} className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading} className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300">Reject</button>
              <button onClick={handleApprove} disabled={actionLoading} className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
