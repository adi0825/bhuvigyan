import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

import Landing from './pages/Landing';
import LoginSelector from './pages/auth/LoginSelector';
import FarmerLogin from './pages/auth/FarmerLogin';
import AdminLogin from './pages/auth/AdminLogin';
import CscLogin from './pages/auth/CscLogin';
import OfficerLogin from './pages/auth/OfficerLogin';
import InsurerLogin from './pages/auth/InsurerLogin';
import StateLogin from './pages/auth/StateLogin';
import FarmerRegister from './pages/auth/FarmerRegister';

import FarmerLayout from './pages/farmer/FarmerLayout';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerCarbon from './pages/farmer/FarmerCarbon';
import FarmerProfile from './pages/farmer/FarmerProfile';
import FarmerLand from './pages/farmer/FarmerLand';
import FarmerSatellite from './pages/farmer/FarmerSatellite';
import FarmerClaims from './pages/farmer/FarmerClaims';
import FarmerReports from './pages/farmer/FarmerReports';
import FarmerHelp from './pages/farmer/FarmerHelp';
import CreateClaim from './pages/farmer/CreateClaim';
import ClaimDetail from './pages/farmer/ClaimDetail';
import FarmerNotifications from './pages/farmer/Notifications';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClaimsList from './pages/admin/ClaimsList';
import FraudDetection from './pages/admin/FraudDetection';
import FarmerManagement from './pages/admin/FarmerManagement';
import SystemHealth from './pages/admin/SystemHealth';
import Analytics from './pages/admin/Analytics';
import DisasterMode from './pages/admin/DisasterMode';
import AssignVisits from './pages/admin/AssignVisits';
import VaoAlerts from './pages/admin/VaoAlerts';
import AuditLog from './pages/admin/AuditLog';
import UserManagement from './pages/admin/UserManagement';
import ModelManagement from './pages/admin/ModelManagement';
import AdapterManagement from './pages/admin/AdapterManagement';
import InspectorManagement from './pages/admin/InspectorManagement';
import Payments from './pages/admin/Payments';
import SatelliteAnalytics from './pages/admin/SatelliteAnalytics';
import AdminSatellitePanel from './pages/admin/AdminSatellitePanel';
import Reports from './pages/admin/Reports';
import AdminFarmerDetail from './pages/admin/AdminFarmerDetail';
import AdminClaimDetail from './pages/admin/AdminClaimDetail';
import AdminNotifications from './pages/admin/AdminNotifications';
import Settings from './pages/admin/Settings';

import CscLayout from './pages/csc/CscLayout';
import CscDashboard from './pages/csc/CscDashboard';

import FieldDashboard from './pages/field-officer/FieldDashboard';
import FieldLayout from './pages/field-officer/FieldLayout';
import VisitDetail from './pages/field-officer/VisitDetail';
import InspectionForm from './pages/field-officer/InspectionForm';
import OfflineSync from './pages/field-officer/OfflineSync';
import InspectorProfile from './pages/field-officer/InspectorProfile';
import InspectorHistory from './pages/field-officer/InspectorHistory';
import InsurerDashboard from './pages/insurer/InsurerDashboard';
import InsurerLayout from './pages/insurer/InsurerLayout';
import FraudAnalytics from './pages/insurer/FraudAnalytics';
import StateDashboard from './pages/state/StateDashboard';
import StateLayout from './pages/state/StateLayout';
import ClaimQueue from './pages/state/ClaimQueue';
import ClaimReview from './pages/state/ClaimReview';
import UnauthorizedPage from './pages/UnauthorizedPage';

import DemoRoleSwitcher from './components/dev/DemoRoleSwitcher';
import OnboardingTour from './components/dev/OnboardingTour';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#1a1a1a',
              border: '1px solid rgba(0,0,0,0.08)',
              backdropFilter: 'blur(20px)',
            },
            success: { style: { border: '1px solid rgba(26,107,60,0.3)' } },
            error: { style: { border: '1px solid rgba(192,57,43,0.3)' } },
          }}
        />

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginSelector />} />
          <Route path="/register" element={<FarmerRegister />} />
          <Route path="/login/farmer" element={<FarmerLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/csc" element={<CscLogin />} />
          <Route path="/login/officer" element={<OfficerLogin />} />
          <Route path="/login/insurer" element={<InsurerLogin />} />
          <Route path="/login/state" element={<StateLogin />} />
          <Route path="/login/inspector" element={<Navigate to="/login/officer" replace />} />

          <Route
            path="/farmer/*"
            element={
              <ProtectedRoute allowedRoles={['FARMER']}>
                <FarmerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<FarmerDashboard />} />
            <Route path="land" element={<FarmerLand />} />
            <Route path="claims" element={<FarmerClaims />} />
            <Route path="claims/new" element={<CreateClaim />} />
            <Route path="claims/:claimId" element={<ClaimDetail />} />
            <Route path="create-claim" element={<Navigate to="claims/new" replace />} />
            <Route path="satellite" element={<FarmerSatellite />} />
            <Route path="carbon" element={<FarmerCarbon />} />
            <Route path="profile" element={<FarmerProfile />} />
            <Route path="notifications" element={<FarmerNotifications />} />
            <Route path="reports" element={<FarmerReports />} />
            <Route path="help" element={<FarmerHelp />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'ANALYST', 'STATE_HEAD', 'DC', 'DISTRICT_OFFICER']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="farmers" element={<FarmerManagement />} />
            <Route path="farmers/:id" element={<AdminFarmerDetail />} />
            <Route path="claims" element={<ClaimsList />} />
            <Route path="claims/:id" element={<AdminClaimDetail />} />
            <Route path="fraud" element={<FraudDetection />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="carbon" element={<AdminDashboard />} />
            <Route path="officers" element={<AdminDashboard />} />
            <Route path="csc" element={<AdminDashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="system" element={<SystemHealth />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="disaster-mode" element={<DisasterMode />} />
            <Route path="assign-visits" element={<AssignVisits />} />
            <Route path="vao-alerts" element={<VaoAlerts />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="models" element={<ModelManagement />} />
            <Route path="adapters" element={<AdapterManagement />} />
            <Route path="inspectors" element={<InspectorManagement />} />
            <Route path="payments" element={<Payments />} />
            <Route path="satellite" element={<SatelliteAnalytics />} />
            <Route path="satellite-v7" element={<AdminSatellitePanel />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route
            path="/csc/*"
            element={
              <ProtectedRoute allowedRoles={['CSC_OPERATOR']}>
                <CscLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CscDashboard />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route
            path="/field/*"
            element={
              <ProtectedRoute allowedRoles={['FIELD_OFFICER', 'FIELD_INSPECTOR', 'DC']}>
                <FieldLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<FieldDashboard />} />
            <Route path="visits" element={<FieldDashboard />} />
            <Route path="visit/:id" element={<VisitDetail />} />
            <Route path="inspect/:id" element={<InspectionForm />} />
            <Route path="history" element={<InspectorHistory />} />
            <Route path="profile" element={<InspectorProfile />} />
            <Route path="offline-sync" element={<OfflineSync />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="/inspector/*" element={<Navigate to="/field/dashboard" replace />} />

          <Route
            path="/insurer/*"
            element={
              <ProtectedRoute allowedRoles={['INSURER']}>
                <InsurerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<InsurerDashboard />} />
            <Route path="fraud-analytics" element={<FraudAnalytics />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route
            path="/state/*"
            element={
              <ProtectedRoute allowedRoles={['STATE_HEAD', 'DC']}>
                <StateLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StateDashboard />} />
            <Route path="claim-queue" element={<ClaimQueue />} />
            <Route path="claims/:claimId" element={<ClaimReview />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <DemoRoleSwitcher />
        <OnboardingTour />
      </BrowserRouter>
    </AuthProvider>
  );
}
