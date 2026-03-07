import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { CustomerLoginPage } from '@/pages/customer-portal/CustomerLoginPage';
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
import { useAuthStore } from '@/store/authStore';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutModal } from '@/components/session/SessionTimeoutModal';
import '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
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

// Session Manager Component
const SessionManager: React.FC = () => {
  const { isAuthenticated, isSessionWarningVisible, remainingTime, logout, extendSession } = useAuthStore();
  
  // Initialize session timeout hook
  useSessionTimeout({
    enabled: isAuthenticated,
    timeoutDuration: 15 * 60 * 1000, // 15 minutes
    warningDuration: 2 * 60 * 1000, // 2 minutes before timeout
    countdownInterval: 1000,
    onSessionExpired: () => {
      logout();
      window.location.href = '/login';
    },
  });

  return (
    <>
      {isSessionWarningVisible && (
        <SessionTimeoutModal
          remainingTime={remainingTime}
          onExtend={() => extendSession()}
          onLogout={() => logout()}
        />
      )}
    </>
  );
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/customer/login"
        element={
          <PublicRoute>
            <CustomerLoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="particulars" element={<ParticularsPage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
        <Route path="challans" element={<ChallansPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
      </Route>
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
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
