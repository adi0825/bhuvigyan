import { Settings as SettingsIcon, User, Shield, Bell } from "lucide-react";
import GovButton from "../../components/ui/GovButton";

export default function Settings() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="w-6 h-6 text-gray-600" /> Settings</h1>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /> Profile</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-500 block mb-1">Full Name</label><input type="text" defaultValue="Admin User" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Email</label><input type="email" defaultValue="admin@bhuvigyan.gov.in" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Security</h3>
        <GovButton variant="outline" size="sm">Change Password</GovButton>
        <GovButton variant="outline" size="sm">Enable 2FA</GovButton>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-orange-500" /> Notifications</h3>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm">Email Alerts</span>
          <input type="checkbox" defaultChecked className="w-4 h-4" />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm">Push Notifications</span>
          <input type="checkbox" defaultChecked className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
