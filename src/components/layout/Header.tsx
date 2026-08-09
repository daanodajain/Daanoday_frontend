import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Bell, Globe, ChevronDown, LogOut, Clock, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, currentStore, setCurrentStore, logout, isSuperAdmin, isSessionWarningVisible, remainingTime } = useAuthStore();
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showSuperAdminStoreDropdown, setShowSuperAdminStoreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'gu', name: 'ગુજરાતી' },
  ];

  // Fetch notification count
  const { data: notifCount } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => apiService.getUnreadNotificationCount(),
    enabled: !!currentStore,
    refetchInterval: 30000,
  });
  const unreadCount = notifCount?.DDMS_data?.count || 0;

  // Fetch stores for super admin store selector
  const { data: allStoresData } = useQuery({
    queryKey: ['super-admin-stores'],
    queryFn: () => apiService.getAllStoresForSuperAdmin(),
    enabled: isSuperAdmin,
  });
  const allStores = allStoresData?.DDMS_data?.stores || allStoresData?.DDMS_data || [];

  const handleStoreChange = async (store: any) => {
    await setCurrentStore(store);
    setShowStoreDropdown(false);
  };

  const handleSuperAdminStoreSelect = async (store: any) => {
    await setCurrentStore({ id: store.id, name: store.name, subscription_status: store.subscription_status });
    setShowSuperAdminStoreDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const formatRemainingTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Super Admin — store picker */}
          {isSuperAdmin && (
            <div className="relative">
              <Button variant="outline" size="sm"
                onClick={() => setShowSuperAdminStoreDropdown(!showSuperAdminStoreDropdown)}
                className="flex items-center gap-2">
                <Store className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">
                  {currentStore ? currentStore.name : 'Select Store to Manage'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showSuperAdminStoreDropdown && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1 max-h-64 overflow-y-auto">
                    <p className="px-4 py-2 text-xs font-semibold text-secondary-500 uppercase">Select Store</p>
                    {allStores.length === 0 && (
                      <p className="px-4 py-3 text-sm text-secondary-500">No stores created yet</p>
                    )}
                    {allStores.map((store: any) => (
                      <button key={store.id} onClick={() => handleSuperAdminStoreSelect(store)}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-secondary-100 ${currentStore?.id === store.id ? 'bg-purple-50 text-purple-700' : 'text-secondary-700'}`}>
                        <p className="font-medium">{store.name}</p>
                        <p className={`text-xs ${store.subscription_status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}`}>
                          {store.subscription_status}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Regular user store switcher */}
          {!isSuperAdmin && user?.stores && user.stores.length > 1 && (
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowStoreDropdown(!showStoreDropdown)} className="hidden sm:flex">
                {currentStore?.name || 'Select Store'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {showStoreDropdown && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {user.stores.map((store: any) => (
                      <button key={store.id} onClick={() => handleStoreChange(store)}
                        className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100">
                        <p className="font-medium">{store.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center space-x-2">
          {/* Session warning */}
          {isSessionWarningVisible && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-amber-50 rounded-full">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">{formatRemainingTime(remainingTime)}</span>
            </div>
          )}

          {/* Language */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}>
              <Globe className="h-4 w-4" />
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {languages.map((lang) => (
                    <button key={lang.code} onClick={() => { i18n.changeLanguage(lang.code); setShowLanguageDropdown(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100">
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification bell with count */}
          <Button variant="ghost" size="sm" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden md:inline">{t('auth.logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
