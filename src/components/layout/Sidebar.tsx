import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  UserCheck, 
  Truck, 
  FileText, 
  Receipt, 
  FileBarChart, 
  CreditCard, 
  BarChart3, 
  Bell, 
  Newspaper,
  Shield,
  Settings,
  LogOut,
  History
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

const navigationItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'stores', icon: Store, path: '/stores', superAdminOnly: true },
  { key: 'users', icon: Users, path: '/users' },
  { key: 'roles', icon: Shield, path: '/roles' },
  { key: 'customers', icon: UserCheck, path: '/customers' },
  { key: 'suppliers', icon: Truck, path: '/suppliers' },
  { key: 'particulars', icon: FileText, path: '/particulars' },
  { key: 'receipts', icon: Receipt, path: '/receipts' },
  { key: 'challans', icon: FileBarChart, path: '/challans' },
  { key: 'transactions', icon: CreditCard, path: '/transactions' },
  { key: 'reports', icon: BarChart3, path: '/reports' },
  { key: 'notifications', icon: Bell, path: '/notifications' },
  { key: 'news', icon: Newspaper, path: '/news' },
  { key: 'audit', icon: History, path: '/audit' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, logout, currentStore } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const isSuperAdmin = user?.roles?.some(role => role.roleName === 'SUPER_ADMIN') || false;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
            <h1 className="text-xl font-bold text-white">Daanoday</h1>
          </div>

          {/* Store Info */}
          {currentStore && (
            <div className="px-4 py-3 bg-primary-50 border-b">
              <p className="text-sm font-medium text-primary-900">
                {currentStore.name}
              </p>
              <p className="text-xs text-primary-600">
                {currentStore.city}, {currentStore.state}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              if (item.superAdminOnly && !isSuperAdmin) {
                return null;
              }

              return (
                <NavLink
                  key={item.key}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    )
                  }
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {t(`navigation.${item.key}`)}
                </NavLink>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-secondary-200 p-4">
            <div className="flex items-center mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-secondary-500 truncate">
                  {user?.mobile}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <NavLink
                to="/settings"
                onClick={onClose}
                className="group flex items-center px-2 py-2 text-sm font-medium text-secondary-600 rounded-md hover:bg-secondary-50 hover:text-secondary-900"
              >
                <Settings className="mr-3 h-4 w-4" />
                {t('navigation.settings')}
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
              >
                <LogOut className="mr-3 h-4 w-4" />
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};