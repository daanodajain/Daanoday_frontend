import React from 'react';
import { Store } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// Store-scoped pages (Users, Customers, Receipts, Challans, Suppliers, Roles, Settings, etc.)
// need an active store context to call the API (X-Store-ID header). A super admin can be
// logged in without any store selected — show a clear prompt instead of a blank/broken page.
export const RequireStore: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin, currentStore } = useAuthStore();

  if (isSuperAdmin && !currentStore) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <Store className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-lg font-semibold text-secondary-900 mb-1">Select a store to continue</h2>
        <p className="text-sm text-secondary-500 max-w-sm">
          This page shows store-specific data. Pick a store from the switcher in the top header first.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireStore;
