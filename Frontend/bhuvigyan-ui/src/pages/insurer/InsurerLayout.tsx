import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import GovStrip from '../../components/layout/GovStrip';
import PageBackground from '../../components/layout/PageBackground';
import { LayoutDashboard, AlertTriangle } from 'lucide-react';

function InsurerSubNav() {
  const loc = useLocation();
  const links = [
    { path: '/insurer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/insurer/fraud-analytics', label: 'Fraud Analytics', icon: AlertTriangle },
  ];
  return (
    <div className="flex gap-4 mb-6 border-b pb-2">
      {links.map((l) => {
        const active = loc.pathname === l.path;
        return (
          <Link key={l.path} to={l.path} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <l.icon className="w-4 h-4" /> {l.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function InsurerLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageBackground />
      <GovStrip />
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full relative z-10">
        <InsurerSubNav />
        <Outlet />
      </main>
      <GovFooter />
    </div>
  );
}