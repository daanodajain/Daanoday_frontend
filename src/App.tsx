import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { CustomerLoginPage } from '@/pages/auth/CustomerLoginPage';
import { CustomerDashboard } from '@/pages/customer-portal/CustomerDashboard';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { StoresPage } from '@/pages/stores/StoresPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { ReceiptsPage } from '@/pages/receipts/ReceiptsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { RolesPage } from '@/pages/roles/RolesPage';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { ParticularsPage } from '@/pages/particulars/ParticularsPage';
import { ChallansPage } from '@/pages/challans/ChallansPage';
import { TransactionsPage } from '@/pages/transactions/TransactionsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { NewsPage } from '@/pages/news/NewsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { AuditLogsPage } from '@/pages/audit/AuditLogsPage';
import { ChangeRequestsPage } from '@/pages/change-requests/ChangeRequestsPage';
import { SuperAdminSubscriptionsPage } from '@/pages/super-admin/SuperAdminSubscriptionsPage';
import { SuperAdminSystemSettingsPage } from '@/pages/super-admin/SuperAdminSystemSettingsPage';
import { RequireStore } from '@/components/common/RequireStore';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import { useInactivityManager } from '@/hooks/useInactivityManager';
import { LockScreen } from '@/components/session/LockScreen';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const SessionManager: React.FC = () => {
  const { isAuthenticated, currentStore, isLocked, unlockSession, setSessionTimeoutConfig } = useAuthStore();

  // Load this store's configured session behavior. Store admin sets these in Settings;
  // if never configured, both stay null and auto-logout/lock are simply OFF.
  const { data: settingsRes } = useQuery({
    queryKey: ['store-settings-session', currentStore?.id],
    queryFn: () => apiService.getStoreSettings(),
    enabled: isAuthenticated && !!currentStore?.id,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const s = settingsRes?.DDMS_data;
    if (s) {
      setSessionTimeoutConfig(
        s.session_timeout_minutes ?? null,
        s.inactivity_lock_minutes ?? null
      );
    }
  }, [settingsRes, setSessionTimeoutConfig]);

  useInactivityManager();

  if (isLocked) {
    return <LockScreen onUnlock={unlockSession} />;
  }
  return null;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/customer/login" element={<PublicRoute><CustomerLoginPage /></PublicRoute>} />
      <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="users" element={<RequireStore><UsersPage /></RequireStore>} />
        <Route path="roles" element={<RequireStore><RolesPage /></RequireStore>} />
        <Route path="customers" element={<RequireStore><CustomersPage /></RequireStore>} />
        <Route path="suppliers" element={<RequireStore><SuppliersPage /></RequireStore>} />
        <Route path="particulars" element={<RequireStore><ParticularsPage /></RequireStore>} />
        <Route path="receipts" element={<RequireStore><ReceiptsPage /></RequireStore>} />
        <Route path="challans" element={<RequireStore><ChallansPage /></RequireStore>} />
        <Route path="transactions" element={<RequireStore><TransactionsPage /></RequireStore>} />
        <Route path="reports" element={<RequireStore><ReportsPage /></RequireStore>} />
        <Route path="notifications" element={<RequireStore><NotificationsPage /></RequireStore>} />
        <Route path="news" element={<RequireStore><NewsPage /></RequireStore>} />
        <Route path="settings" element={<RequireStore><SettingsPage /></RequireStore>} />
        <Route path="audit" element={<RequireStore><AuditLogsPage /></RequireStore>} />
        <Route path="change-requests" element={<RequireStore><ChangeRequestsPage /></RequireStore>} />
        <Route path="super-admin/subscriptions" element={<SuperAdminSubscriptionsPage />} />
        <Route path="super-admin/settings" element={<SuperAdminSystemSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <SessionManager />
          <AppRoutes />
          <InstallPrompt />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff' },
              success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { duration: 5000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
