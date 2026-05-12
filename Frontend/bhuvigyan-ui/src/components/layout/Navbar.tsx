import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'PMFBY', path: '/pmfby' },
    { label: 'Help', path: '/help' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-10 z-40 bg-white border-b border-[#e5e7eb] shadow-[0_1px_4px_rgba(0,0,0,0.06)] h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/bhuvigyan-logo.svg" alt="Bhuvigyan" className="w-8 h-8" />
            <span className="font-bold text-[20px] text-[#1a1a1a]">Bhuvigyan</span>
          </Link>
          <span className="hidden md:block h-6 w-[1.5px] bg-[#e5e7eb]" />
          <span className="hidden md:block text-[12px] text-[#6b7280] font-deva">फसल बीमा एवं कार्बन क्रेडिट पोर्टल</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-all relative py-2 ${
                isActive(link.path) 
                  ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-[3px] after:bg-primary after:rounded-full' 
                  : 'text-[#6b7280] hover:text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[13px] font-semibold text-[#1a1a1a] leading-none">
                    {user.fullName || 'Rajesh Kumar'}
                  </p>
                  <p className="text-[11px] text-[#6b7280] leading-none mt-1 uppercase tracking-tighter">
                    {user.role}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-[#e5e7eb] py-2 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#f3f4f6] mb-1">
                    <p className="text-xs text-[#9ca3af] uppercase font-bold tracking-widest">Signed in as</p>
                    <p className="text-sm font-semibold text-[#1a1a1a] truncate">{user.mobile || user.email}</p>
                  </div>
                  <Link
                    to={`/${user.role === 'FARMER' ? 'farmer' : 'admin'}/profile`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4b5563] hover:bg-[#f0fdf4] hover:text-primary transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login/farmer" className="btn-outline text-[13px]">
                Farmer Login
              </Link>
              <Link to="/login/admin" className="btn-ghost text-[13px] hidden sm:inline text-[#6b7280] hover:text-primary hover:no-underline">
                Admin
              </Link>
            </>
          )}
          <button className="md:hidden p-2 text-[#4b5563]" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#e5e7eb] px-4 py-4 space-y-4 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block py-2 text-sm font-semibold ${isActive(link.path) ? 'text-primary' : 'text-[#4b5563]'}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <div className="pt-2 border-top border-[#f3f4f6] flex flex-col gap-2">
              <Link to="/login/farmer" className="btn-primary w-full text-center" onClick={() => setMobileOpen(false)}>
                Farmer Login
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
