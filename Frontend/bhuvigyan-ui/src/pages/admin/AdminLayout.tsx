import { useState, Component, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminTopBar from '../../components/layout/AdminTopBar';
import GovStrip from '../../components/layout/GovStrip';
import PageBackground from '../../components/layout/PageBackground';
import { useAuth } from '../../auth/AuthContext';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-4 max-w-md text-center">
            This page encountered an error. Try refreshing or navigate to another tab.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Refresh Page
          </button>
          {this.state.error && (
            <pre className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <PageBackground />
      <GovStrip />
      <div className="flex flex-1 pt-9">
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
          <AdminTopBar onMenuClick={() => setCollapsed(!collapsed)} />
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}