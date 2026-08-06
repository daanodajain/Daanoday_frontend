import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

export const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canUpdate } = usePermissions();
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
  });

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

  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: any) =>
      apiService.assignPermissionsToRole(String(roleId), permissionIds.map(String)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permissions saved');
      setShowPermissionsModal(false);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save permissions'),
  });

  React.useEffect(() => {
    if (rolePermsData?.DDMS_data) {
      setSelectedPermissions((rolePermsData.DDMS_data || []).map((p: any) => p.id));
    }
  }, [rolePermsData]);

  const roles = rolesData?.DDMS_data || [];
  const permissions = permissionsData?.DDMS_data || [];

  // Group permissions by resource
  const grouped = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  if (isLoading) return <div className="animate-pulse p-6">Loading roles...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roles & Permissions</h1>

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
                    {canUpdate('roles') && (
                      <Button variant="ghost" size="sm" title="Manage Permissions"
                        onClick={() => { setSelectedRole(role); setSelectedPermissions([]); setShowPermissionsModal(true); }}>
                        <Shield className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)}
        title={`Permissions — ${selectedRole?.name}`} size="lg">
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
                      {selectedPermissions.includes(p.id) && <Check className="w-4 h-4 text-green-600" />}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => assignPermissionsMutation.mutate({ roleId: selectedRole.id, permissionIds: selectedPermissions })}
              disabled={assignPermissionsMutation.isPending}>
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
