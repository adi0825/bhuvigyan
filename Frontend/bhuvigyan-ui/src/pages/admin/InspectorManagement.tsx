import React, { useState, useEffect } from 'react';
import { Plus, Search, ShieldCheck, Star, MapPin } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import GovButton from '../../components/ui/GovButton';
import GovCard from '../../components/ui/GovCard';
import { adminInspectorApi } from '../../api/inspector';

interface Inspector {
  id: string;
  full_name: string;
  employee_id: string;
  mobile: string;
  department?: string;
  badge_number?: string;
  state: string;
  is_active: boolean;
  total_visits: number;
  completed_visits: number;
  districts_assigned: string[];
}

export default function InspectorManagement() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newInspector, setNewInspector] = useState({
    full_name: '', employee_id: '', mobile: '', state: 'Karnataka', department: '', badge_number: '', districts_assigned: [] as string[],
  });

  const fetchInspectors = async () => {
    try {
      setLoading(true);
      const res = await adminInspectorApi.listInspectors();
      setInspectors(res.data?.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInspectors(); }, []);

  const handleCreate = async () => {
    try {
      await adminInspectorApi.createInspector(newInspector);
      setShowCreate(false);
      setNewInspector({ full_name: '', employee_id: '', mobile: '', state: 'Karnataka', department: '', badge_number: '', districts_assigned: [] });
      fetchInspectors();
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const filtered = inspectors.filter(
    (i) =>
      !search ||
      i.full_name.toLowerCase().includes(search.toLowerCase()) ||
      i.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      i.mobile.includes(search)
  );

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600" /> Field Inspectors
          </h1>
          <GovButton variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Inspector
          </GovButton>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
              <h2 className="text-lg font-bold">Add New Inspector</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={newInspector.full_name} onChange={(e) => setNewInspector({ ...newInspector, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={newInspector.employee_id} onChange={(e) => setNewInspector({ ...newInspector, employee_id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile</label>
                  <input className="w-full border rounded-lg px-3 py-2" maxLength={10} value={newInspector.mobile} onChange={(e) => setNewInspector({ ...newInspector, mobile: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={newInspector.state} onChange={(e) => setNewInspector({ ...newInspector, state: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={newInspector.department} onChange={(e) => setNewInspector({ ...newInspector, department: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Badge Number</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={newInspector.badge_number} onChange={(e) => setNewInspector({ ...newInspector, badge_number: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <GovButton variant="outline" onClick={() => setShowCreate(false)}>Cancel</GovButton>
                <GovButton variant="primary" onClick={handleCreate} disabled={!newInspector.full_name || !newInspector.employee_id || !newInspector.mobile}>Create</GovButton>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-gray-500">Loading inspectors...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No inspectors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((inspector) => (
              <GovCard key={inspector.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{inspector.full_name}</h3>
                    <p className="text-sm text-gray-500">{inspector.employee_id}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${inspector.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inspector.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-gray-600">📱 {inspector.mobile}</p>
                  <p className="text-gray-600">🏛️ {inspector.department || 'Field Inspection'}</p>
                  <p className="text-gray-600">📍 {inspector.state}</p>
                  <p className="text-gray-600">
                    🏘️ Districts: {inspector.districts_assigned?.join(', ') || 'None assigned'}
                  </p>
                </div>
                <div className="mt-4 flex gap-3 text-sm">
                  <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{inspector.total_visits || 0}</p>
                    <p className="text-xs text-gray-500">Total Visits</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-600">{inspector.completed_visits || 0}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-purple-600">
                      {inspector.total_visits && inspector.total_visits > 0
                        ? Math.round((inspector.completed_visits / inspector.total_visits) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Rate</p>
                  </div>
                </div>
              </GovCard>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
