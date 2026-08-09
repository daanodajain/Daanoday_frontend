import { useAuthStore } from '@/store/authStore';

export const usePermissions = () => {
  const { user } = useAuthStore();

  const isSuperAdmin = () => {
    return user?.roles?.some(role => role.name === 'SUPER_ADMIN') || false;
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin()) return true;

    // Check role-based permissions
    if (user.roles?.some(role =>
      role.permissions?.some(
        (perm: any) => perm.resource === resource && perm.action === action
      )
    )) return true;

    return false;
  };

  const canView = (resource: string) => isSuperAdmin() || hasPermission(resource, 'read');
  const canCreate = (resource: string) => isSuperAdmin() || hasPermission(resource, 'create');
  const canUpdate = (resource: string) => isSuperAdmin() || hasPermission(resource, 'update');
  const canDelete = (resource: string) => isSuperAdmin() || hasPermission(resource, 'delete');
  const canApprove = (resource: string) => isSuperAdmin() || hasPermission(resource, 'approve');
  
  // FIX: Ye naya function add kiya hai roles manage karne ke liye
  const canManage = (resource: string) => isSuperAdmin() || hasPermission(resource, 'manage');

  return {
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canApprove,
    canManage, // Isse ab RolesPage crash nahi hoga
    isSuperAdmin,
  };
};
