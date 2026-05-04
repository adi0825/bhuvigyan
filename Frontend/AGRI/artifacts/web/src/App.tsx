import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AdminLayout } from "@/components/layout/admin-layout";

import Landing from "@/pages/landing";
import AdminLogin from "@/pages/auth/admin-login";
import FarmerLogin from "@/pages/farmer/login";
import FarmerRegister from "@/pages/farmer/register";
import FarmerDashboard from "@/pages/farmer/dashboard";
import FileClaim from "@/pages/farmer/file-claim";
import FarmerClaimStatus from "@/pages/farmer/claim-status";
import FarmerNotifications from "@/pages/farmer/notifications";
import FarmerLand from "@/pages/farmer/land";
import FarmerCarbon from "@/pages/farmer/carbon";
import FarmerUdlrn from "@/pages/farmer/udlrn";
import FarmerAppeal from "@/pages/farmer/appeal";

import AdminDashboard from "@/pages/admin/dashboard";
import ReviewQueue from "@/pages/admin/review-queue";
import ClaimDetail from "@/pages/admin/claim-detail";
import FraudHeatmap from "@/pages/admin/heatmap";
import UdlrnSearch from "@/pages/admin/udlrn-search";
import AuditLog from "@/pages/admin/audit-log";
import Officers from "@/pages/admin/officers";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminCarbon from "@/pages/admin/carbon";
import AdminCscOperators from "@/pages/admin/csc-operators";
import AdminRules from "@/pages/admin/rules";
import SystemHealth from "@/pages/admin/system-health";
import ModelRegistry from "@/pages/admin/model-registry";
import AdminCscActivity from "@/pages/admin/csc-activity";

import CscLogin from "@/pages/csc/login";
import CscDashboard from "@/pages/csc/dashboard";
import CscFarmerLookup from "@/pages/csc/farmer-lookup";
import CscMyClaims from "@/pages/csc/my-claims";
import CscClaimNew from "@/pages/csc/claim-new";

import InspectorLogin from "@/pages/inspector/login";
import InspectorAssignments from "@/pages/inspector/assignments";
import InspectorVisit from "@/pages/inspector/visit";
import InspectorAnalytics from "@/pages/inspector/analytics";

import InsurerLogin from "@/pages/insurer/login";
import InsurerDashboard from "@/pages/insurer/dashboard";
import InsurerEvidence from "@/pages/insurer/evidence";
import InsurerClaims from "@/pages/insurer/claims";
import InsurerAnalytics from "@/pages/insurer/analytics";

import FarmerProfile from "@/pages/farmer/profile";

import { DegradedBanner } from "@/components/degraded-banner";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const ADMIN_ROLES = ["SUPER_ADMIN", "STATE_HEAD", "DC", "DISTRICT_OFFICER", "FIELD_INSPECTOR", "ANALYST"];

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/admin/login" />;
  if (!ADMIN_ROLES.includes(user.role)) return <Redirect to="/farmer/dashboard" />;
  return <AdminLayout>{children}</AdminLayout>;
}

function ProtectedFarmer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/farmer/login" />;
  if (user.role !== "FARMER") return <Redirect to="/admin" />;
  return <>{children}</>;
}

function CscGuard({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("csc_token")) return <Redirect to="/csc/login" />;
  return <>{children}</>;
}

function InspectorGuard({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("inspector_token")) return <Redirect to="/inspector/login" />;
  return <>{children}</>;
}

function InsurerGuard({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("insurer_token")) return <Redirect to="/insurer/login" />;
  return <>{children}</>;
}

function AppRouter() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Landing */}
      <Route path="/" component={Landing} />

      {/* Auth */}
      <Route path="/admin/login">
        {user && ADMIN_ROLES.includes(user.role) ? <Redirect to="/admin" /> : <AdminLogin />}
      </Route>
      <Route path="/farmer/login">
        {user?.role === "FARMER" ? <Redirect to="/farmer/dashboard" /> : <FarmerLogin />}
      </Route>
      <Route path="/farmer/register" component={FarmerRegister} />

      {/* Farmer routes */}
      <Route path="/farmer/dashboard">
        <ProtectedFarmer><FarmerDashboard /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/file-claim">
        <ProtectedFarmer><FileClaim /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/claims/:id">
        <ProtectedFarmer><FarmerClaimStatus /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/notifications">
        <ProtectedFarmer><FarmerNotifications /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/land">
        <ProtectedFarmer><FarmerLand /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/carbon">
        <ProtectedFarmer><FarmerCarbon /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/udlrn">
        <ProtectedFarmer><FarmerUdlrn /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/profile">
        <ProtectedFarmer><FarmerProfile /></ProtectedFarmer>
      </Route>
      <Route path="/farmer/claims/:id/appeal">
        {(params) => <ProtectedFarmer><FarmerAppeal /></ProtectedFarmer>}
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedAdmin><AdminDashboard /></ProtectedAdmin>
      </Route>
      <Route path="/admin/review-queue">
        <ProtectedAdmin><ReviewQueue /></ProtectedAdmin>
      </Route>
      <Route path="/admin/claims/:id">
        {(params) => <ProtectedAdmin><ClaimDetail params={params} /></ProtectedAdmin>}
      </Route>
      <Route path="/admin/heatmap">
        <ProtectedAdmin><FraudHeatmap /></ProtectedAdmin>
      </Route>
      <Route path="/admin/udlrn-search">
        <ProtectedAdmin><UdlrnSearch /></ProtectedAdmin>
      </Route>
      <Route path="/admin/audit-log">
        <ProtectedAdmin><AuditLog /></ProtectedAdmin>
      </Route>
      <Route path="/admin/officers">
        <ProtectedAdmin><Officers /></ProtectedAdmin>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedAdmin><AdminAnalytics /></ProtectedAdmin>
      </Route>
      <Route path="/admin/carbon">
        <ProtectedAdmin><AdminCarbon /></ProtectedAdmin>
      </Route>
      <Route path="/admin/csc-operators">
        <ProtectedAdmin><AdminCscOperators /></ProtectedAdmin>
      </Route>
      <Route path="/admin/rules">
        <ProtectedAdmin><AdminRules /></ProtectedAdmin>
      </Route>
      <Route path="/admin/system-health">
        <ProtectedAdmin><SystemHealth /></ProtectedAdmin>
      </Route>
      <Route path="/admin/model-registry">
        <ProtectedAdmin><ModelRegistry /></ProtectedAdmin>
      </Route>
      <Route path="/admin/csc-activity">
        <ProtectedAdmin><AdminCscActivity /></ProtectedAdmin>
      </Route>

      {/* CSC Portal */}
      <Route path="/csc/login" component={CscLogin} />
      <Route path="/csc/dashboard">
        <CscGuard><CscDashboard /></CscGuard>
      </Route>
      <Route path="/csc/farmer-lookup">
        <CscGuard><CscFarmerLookup /></CscGuard>
      </Route>
      <Route path="/csc/my-claims">
        <CscGuard><CscMyClaims /></CscGuard>
      </Route>
      <Route path="/csc/claim/new/:udlrn">
        {(params) => <CscGuard><CscClaimNew params={params} /></CscGuard>}
      </Route>

      {/* Inspector Portal */}
      <Route path="/inspector/login" component={InspectorLogin} />
      <Route path="/inspector/assignments">
        <InspectorGuard><InspectorAssignments /></InspectorGuard>
      </Route>
      <Route path="/inspector/visit/:id">
        {(params) => <InspectorGuard><InspectorVisit params={params} /></InspectorGuard>}
      </Route>
      <Route path="/inspector/analytics">
        <InspectorGuard><InspectorAnalytics /></InspectorGuard>
      </Route>

      {/* Insurer Portal */}
      <Route path="/insurer/login" component={InsurerLogin} />
      <Route path="/insurer/dashboard">
        <InsurerGuard><InsurerDashboard /></InsurerGuard>
      </Route>
      <Route path="/insurer/claims">
        <InsurerGuard><InsurerClaims /></InsurerGuard>
      </Route>
      <Route path="/insurer/analytics">
        <InsurerGuard><InsurerAnalytics /></InsurerGuard>
      </Route>
      <Route path="/insurer/evidence/:claimId">
        {(params) => <InsurerGuard><InsurerEvidence params={params} /></InsurerGuard>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DegradedBanner />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
