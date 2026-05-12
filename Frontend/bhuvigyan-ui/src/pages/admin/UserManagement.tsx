import { useState, useEffect } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface UserRecord {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  fullName?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/officers');
      const data = (res.data as any)?.data || [];
      setUsers(data.map((o: any) => ({
        id: o.id,
        email: o.email || o.fullName || 'Unknown',
        role: o.role || 'OFFICER',
        isActive: true,
        totpEnabled: false,
        fullName: o.fullName,
      })));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) =>
    (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.role?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.fullName?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const toggleActive = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)));
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search by email or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border rounded-md px-3 py-2" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Add User</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">2FA</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading users...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">No users found</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{u.fullName || u.email}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">{u.role}</span></td>
                  <td className="px-4 py-3">{u.totpEnabled ? "Enabled" : "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{u.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => toggleActive(u.id)} className="text-xs text-blue-600 hover:underline">{u.isActive ? "Deactivate" : "Activate"}</button>
                    <button className="text-xs text-gray-500 hover:underline">Reset 2FA</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
