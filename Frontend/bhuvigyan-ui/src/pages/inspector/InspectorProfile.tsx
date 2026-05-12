import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Shield } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import GovButton from '../../components/ui/GovButton';
import { inspectorApi } from '../../api/inspector';
import { useAuth } from '../../auth/AuthContext';

export default function InspectorProfile() {
  const { user } = useAuth();
  const [inspector, setInspector] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', mobile: '' });

  useEffect(() => {
    const fetch = async () => {
      if (!user?.userId) return;
      try {
        const res = await inspectorApi.getProfile(user.userId);
        const data = res.data?.data;
        setInspector(data);
        setFormData({ full_name: data?.full_name || '', mobile: data?.mobile || '' });
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.userId]);

  const handleSave = async () => {
    if (!user?.userId) return;
    try {
      await inspectorApi.updateProfile(user.userId, formData);
      setInspector({ ...inspector, ...formData });
      setEditing(false);
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  if (loading) return <div className="p-6">Loading profile...</div>;
  if (!inspector) return <div className="p-6">Profile not found</div>;

  return (
    <PageTransition>
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Inspector Profile</h1>
          <GovButton size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </GovButton>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{inspector.full_name}</h2>
              <p className="text-sm text-gray-500">{inspector.employee_id} • {inspector.department || 'Field Inspection'}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  maxLength={10}
                />
              </div>
              <GovButton variant="primary" onClick={handleSave}>Save Changes</GovButton>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 flex items-center gap-1"><Phone className="w-4 h-4" /> Mobile</p>
                <p className="font-medium">{inspector.mobile}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1"><Shield className="w-4 h-4" /> Badge</p>
                <p className="font-medium">{inspector.badge_number || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1"><MapPin className="w-4 h-4" /> State</p>
                <p className="font-medium">{inspector.state}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1"><Shield className="w-4 h-4" /> Status</p>
                <p className="font-medium text-green-600">{inspector.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Visits</p>
                <p className="font-medium">{inspector.total_visits || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Completed</p>
                <p className="font-medium">{inspector.completed_visits || 0}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Districts Assigned</p>
                <p className="font-medium">
                  {inspector.districts_assigned?.join(', ') || 'None'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
