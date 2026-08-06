import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Bell, Globe, ChevronDown, LogOut, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { user, currentStore, setCurrentStore, logout, isSessionWarningVisible, remainingTime, isSessionActive } = useAuthStore();
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'gu', name: 'ગુજરાતી' },
  ];

  const handleStoreChange = async (store: any) => {
    try {
      await setCurrentStore(store);
      setShowStoreDropdown(false);
    } catch (error) {
      console.error('Failed to switch store:', error);
      // Handle error - maybe show toast notification
    }
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Format remaining time for display
  const formatRemainingTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="ml-4 lg:ml-0">
            <h1 className="text-xl font-semibold text-secondary-900">
              {t('navigation.dashboard')}
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Session Timeout Warning Indicator */}
          {isSessionWarningVisible && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-amber-50 rounded-full">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">
                {formatRemainingTime(remainingTime)}
              </span>
            </div>
          )}

          {/* Store Switcher */}
          {user?.stores && user.stores.length > 1 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                className="hidden sm:flex"
              >
                {currentStore?.name || 'Select Store'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              
              {showStoreDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {user.stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => handleStoreChange(store)}
                        className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                      >
                        <p className="font-medium">{store.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Language Switcher */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <Globe className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">
                {languages.find(lang => lang.code === i18n.language)?.name || 'English'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => handleLanguageChange(language.code)}
                      className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                    >
                      {language.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
            <span className="sr-only">{t('navigation.notifications')}</span>
          </Button>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hidden sm:flex"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2">{t('auth.logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
