import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useFarmerData } from '../../hooks/useFarmerData';
import FarmerSidebar from '../../components/layout/FarmerSidebar';
import FarmerTopBar from '../../components/layout/FarmerTopBar';

export default function FarmerLayout() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const { profile, land, loading, unreadCount } = useFarmerData();

  const handleLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <FarmerSidebar
        profile={profile}
        land={land}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <FarmerTopBar
          profile={profile}
          land={land}
          unreadCount={unreadCount}
          loading={loading}
        />
        <main className="flex-1 p-5 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}