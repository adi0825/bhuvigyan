import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, hasRole } from './AuthContext';
import type { Role } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Fallback: always verify token exists in localStorage to prevent stale-state issues
  const hasToken = !!localStorage.getItem('accessToken');
  const reallyAuthenticated = isAuthenticated && hasToken;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-glass-gradient">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // Token exists in localStorage but React state hasn't caught up yet (login race)
  if (!isAuthenticated && hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-glass-gradient">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!reallyAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !hasRole(user.role, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}