import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

export const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // FIX 1: Humare DB mein 'roles' ke liye sirf 'manage' permission hai.
  // Isliye canCreate/canUpdate/canDelete ki jagah canManage use karenge.
  const { canManage } = usePermissions();
  const canManageRoles = canManage('roles'); 

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
  });

  // ... (Baaki Mutations waise hi rahenge)
  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: any) =>
      apiService.assignPermissionsToRole(String(roleId), permissionIds.map(String)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permissions saved');
      setShowPermissionsModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e.message || 'Failed to save permissions'),
  });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => apiService.createRole({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created');
      closeRoleModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e.message || 'Failed to create role'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiService.updateRole(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated');
      closeRoleModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e.message || 'Failed to update role'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e.message || 'Failed to delete role'),
  });

  // FIX 2: List se SUPER_ADMIN ko filter kar do (Safety ke liye Frontend pe bhi)
  const roles = (rolesData?.DDMS_data || []).filter(
    (r: any) => r.name.toUpperCase() !== 'SUPER_ADMIN'
  );

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => apiService.getAllPermissions(),
    enabled: showPermissionsModal,
  });

  const { data: rolePermsData } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: () => apiService.get(`/roles/${selectedRole.id}/permissions`),
    enabled: !!selectedRole && showPermissionsModal,
  });

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
    setRoleName('');
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setShowRoleModal(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setShowRoleModal(true);
  };

  const handleSaveRole = () => {
    if (!roleName.trim()) { toast.error('Role name is required'); return; }
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, name: roleName.trim() });
    } else {
      createRoleMutation.mutate(roleName.trim());
    }
  };

  const handleDeleteRole = (role: any) => {
    if (window.confirm(`Delete role "${role.name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  React.useEffect(() => {
    if (rolePermsData?.DDMS_data) {
      setSelectedPermissions((rolePermsData.DDMS_data || []).map((p: any) => p.id));
    }
  }, [rolePermsData]);

  const permissions = permissionsData?.DDMS_data || [];
  const grouped = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  if (isLoading) return <div className="animate-pulse p-6">Loading roles...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        {/* FIX 3: canCreate ki jagah canManageRoles use kiya */}
        {canManageRoles && (
          <Button onClick={openCreateRole}>
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Roles ({roles.length})</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Role Name</th>
                <th className="table-header-cell">Scope</th>
                <th className="table-header-cell">Permissions</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role: any) => (
                <tr key={role.id} className="hover:bg-secondary-50">
                  <td className="table-cell font-medium">
                    <div className="flex items-center"><Shield className="w-4 h-4 mr-2 text-primary-600" />{role.name}</div>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${role.store_id ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {role.store_id ? 'Store' : 'Global'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs">
                      {role.permission_count ?? '—'} permissions
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {/* Button visibility fix for Edit/Permissions */}
                      {canManageRoles && (
                        <Button variant="ghost" size="sm" title="Manage Permissions"
                          onClick={() => { setSelectedRole(role); setSelectedPermissions([]); setShowPermissionsModal(true); }}>
                          <Shield className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {canManageRoles && role.store_id && (
                        <Button variant="ghost" size="sm" title="Rename Role" onClick={() => openEditRole(role)}>
                          <Edit className="w-4 h-4 text-secondary-600" />
                        </Button>
                      )}
                      {canManageRoles && role.store_id && (
                        <Button variant="ghost" size="sm" title="Delete Role" onClick={() => handleDeleteRole(role)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals waise hi rahenge... */}
      <Modal isOpen={showRoleModal} onClose={closeRoleModal} title={editingRole ? 'Rename Role' : 'Add Role'}>
        <div className="space-y-4">
          <Input label="Role Name" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Accountant" autoFocus />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={closeRoleModal}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveRole} disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
              {editingRole ? 'Save' : 'Create Role'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} title={`Permissions — ${selectedRole?.name}`} size="lg">
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-3">
            {Object.entries(grouped).map(([resource, perms]: [string, any]) => (
              <div key={resource} className="border rounded-lg p-3 bg-secondary-50">
                <h3 className="font-semibold text-sm capitalize mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-primary-600" />{resource}
                </h3>
                <div className="ml-6 space-y-1">
                  {perms.map((p: any) => (
                    <label key={p.id} className="flex items-center p-2 bg-white border rounded hover:bg-secondary-50 cursor-pointer">
                      <input type="checkbox" className="mr-3 h-4 w-4 text-primary-600 rounded"
                        checked={selectedPermissions.includes(p.id)}
                        onChange={() => setSelectedPermissions(prev =>
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        )} />
                      <span className="text-sm flex-1">{p.action}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => assignPermissionsMutation.mutate({ roleId: selectedRole.id, permissionIds: selectedPermissions })}
              disabled={assignPermissionsMutation.isPending}>Save Permissions</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
