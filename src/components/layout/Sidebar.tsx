import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, Store, Users, UserCheck, Truck, FileText, Receipt, 
  FileBarChart, CreditCard, BarChart3, Bell, Newspaper, Shield, Settings, 
  LogOut, History, GitPullRequest, Crown, Wrench
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { clsx } from 'clsx';

// permission: [resource, action] — null means always show (dashboard/notifications)
const navigationItems = [
  { key: 'dashboard',               label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard',                    permission: null },
  { key: 'stores',                  label: 'Stores',          icon: Store,           path: '/stores',                       superAdminOnly: true },
  { key: 'superAdminSubscriptions', label: 'Subscriptions',   icon: Crown,           path: '/super-admin/subscriptions',    superAdminOnly: true },
  { key: 'superAdminSettings',      label: 'System Settings', icon: Wrench,          path: '/super-admin/settings',         superAdminOnly: true },
  { key: 'users',                   label: 'Users',           icon: Users,           path: '/users',                        permission: ['users', 'read'] },
  { key: 'roles',                   label: 'Roles',           icon: Shield,          path: '/roles',                        permission: ['roles', 'read'] },
  { key: 'customers',               label: 'Customers',       icon: UserCheck,       path: '/customers',                    permission: ['customers', 'read'] },
  { key: 'suppliers',               label: 'Suppliers',       icon: Truck,           path: '/suppliers',                    permission: ['suppliers', 'read'] },
  { key: 'particulars',             label: 'Particulars',     icon: FileText,        path: '/particulars',                  permission: ['particulars', 'read'] },
  { key: 'receipts',                label: 'Receipts',        icon: Receipt,         path: '/receipts',                     permission: ['receipts', 'read'] },
  { key: 'challans',                label: 'Challans',        icon: FileBarChart,    path: '/challans',                     permission: ['challans', 'read'] },
  { key: 'transactions',            label: 'Transactions',    icon: CreditCard,      path: '/transactions',                 permission: ['transactions', 'read'] },
  { key: 'reports',                 label: 'Reports',         icon: BarChart3,       path: '/reports',                      permission: ['reports', 'read'] },
  { key: 'changeRequests',          label: 'Change Requests', icon: GitPullRequest,  path: '/change-requests',              permission: ['change_requests', 'read'] },
  { key: 'notifications',           label: 'Notifications',   icon: Bell,            path: '/notifications',                permission: ['notifications', 'read'] },
  { key: 'news',                    label: 'News & Events',   icon: Newspaper,       path: '/news',                         permission: ['news_events', 'read'] },
  { key: 'audit',                   label: 'Audit Logs',      icon: History,         path: '/audit',                        permission: ['audit_logs', 'read'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, currentStore, isSuperAdmin } = useAuthStore();
  const { hasPermission } = usePermissions();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-secondary-600 bg-opacity-75 lg:hidden" onClick={onClose} />
      )}

      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={clsx('flex items-center justify-center h-16 px-4', isSuperAdmin ? 'bg-purple-700' : 'bg-primary-600')}>
            <h1 className="text-xl font-bold text-white">
              {isSuperAdmin ? '🛡️ Super Admin' : '🏛️ Daanoday'}
            </h1>
          </div>

          {/* Store Info */}
          {currentStore && !isSuperAdmin && (
            <div className="px-4 py-3 bg-primary-50 border-b">
              <p className="text-sm font-medium text-primary-900">{currentStore.name}</p>
              <p className={clsx('text-xs font-medium', 
                currentStore.subscription_status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {currentStore.subscription_status}
              </p>
            </div>
          )}

          {/* Super Admin Badge */}
          {isSuperAdmin && (
            <div className="px-4 py-3 bg-purple-50 border-b">
              <p className="text-xs font-medium text-purple-700">Full System Access</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {/* Super Admin section */}
            {isSuperAdmin && (
              <p className="px-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1">Super Admin</p>
            )}
            {navigationItems.map((item) => {
              if (item.superAdminOnly && !isSuperAdmin) return null;
              // Hide store-scoped items from super admin when no store selected
              if (!item.superAdminOnly && isSuperAdmin) {
                // Super admin sees all store-scoped items
              } else if (!isSuperAdmin && item.permission) {
                // Regular user: check permission
                const [resource, action] = item.permission;
                if (!hasPermission(resource, action)) return null;
              }

              // Add section divider before regular items for super admin
              const isFirstRegularItem = item.key === 'users';
              
              return (
                <React.Fragment key={item.key}>
                  {isSuperAdmin && isFirstRegularItem && (
                    <div className="pt-2 pb-1">
                      <p className="px-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">Store Management</p>
                    </div>
                  )}
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => clsx(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? isSuperAdmin ? 'bg-purple-100 text-purple-900' : 'bg-primary-100 text-primary-900'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </NavLink>
                </React.Fragment>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-secondary-200 p-4">
            <NavLink
              to="/profile"
              onClick={onClose}
              className="flex items-center mb-3 hover:bg-secondary-50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3',
                isSuperAdmin ? 'bg-purple-600' : 'bg-primary-600'
              )}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 truncate">{user?.name}</p>
                <p className="text-xs text-secondary-500 truncate">{user?.email || user?.mobile}</p>
              </div>
            </NavLink>
            
            <div className="space-y-1">
              <NavLink
                to="/settings"
                onClick={onClose}
                className="group flex items-center px-2 py-2 text-sm font-medium text-secondary-600 rounded-md hover:bg-secondary-50 hover:text-secondary-900"
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
