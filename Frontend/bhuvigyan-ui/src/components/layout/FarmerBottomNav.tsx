import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, FileText, User, Bell, Satellite } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/farmer/dashboard' },
  { icon: Map, label: 'My Land', path: '/farmer/land' },
  { icon: FileText, label: 'My Claims', path: '/farmer/claims' },
  { icon: Satellite, label: 'Satellite', path: '/farmer/satellite' },
  { icon: Bell, label: 'Notifications', path: '/farmer/notifications' },
  { icon: User, label: 'Profile', path: '/farmer/profile' },
];

export default function FarmerBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e7eb] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-[#6b7280] hover:text-[#1a6b3c]'
              )}
            >
              {({ isActive: linkActive }) => (
                <>
                  <item.icon className={clsx('w-5 h-5 transition-colors', linkActive ? 'text-primary' : 'text-[#9ca3af]')} />
                  <span className={clsx('text-[11px] font-bold transition-colors', linkActive ? 'text-primary' : 'text-[#9ca3af]')}>{item.label}</span>
                  {linkActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}