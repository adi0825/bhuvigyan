import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import RootLayout from '../components/layout/RootLayout';

export default function UnauthorizedPage() {
  return (
    <RootLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-12 text-center max-w-md">
          <ShieldX className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You don't have permission to access this page.
          </p>
          <Link to="/">
            <GlassButton variant="primary">
              <ArrowLeft className="w-4 h-4" />
              Go to Home
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    </RootLayout>
  );
}