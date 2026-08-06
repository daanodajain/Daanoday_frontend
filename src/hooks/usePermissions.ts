import { useAuthStore } from '@/store/authStore';

export const usePermissions = () => {
  const { user } = useAuthStore();

  // Check if user is Super Admin
  const isSuperAdmin = () => {
    return user?.roles?.some(role => role.name === 'SUPER_ADMIN') || false;
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;

    // Super Admin has all permissions
    if (isSuperAdmin()) return true;

    // Check role-based permissions (new format from users API)
    if (user.roles?.some(role =>
      role.permissions?.some(
        (perm: any) => perm.resource === resource && perm.action === action
      )
    )) return true;

    // Fallback: check top-level permissions array (from login response)
    // Note: AuthUser does not have top-level permissions in new schema
    return false;
  };

  const canView = (resource: string) => isSuperAdmin() || hasPermission(resource, 'read');
  const canCreate = (resource: string) => isSuperAdmin() || hasPermission(resource, 'create');
  const canUpdate = (resource: string) => isSuperAdmin() || hasPermission(resource, 'update');
  const canDelete = (resource: string) => isSuperAdmin() || hasPermission(resource, 'delete');
  const canApprove = (resource: string) => isSuperAdmin() || hasPermission(resource, 'approve');

  return {
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canApprove,
    isSuperAdmin,
  };
};
