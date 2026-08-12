import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, User, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', mobile: '', password: '', roleId: '' });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
    enabled: showModal || showRoleModal,
  });

  // ... (Baaki saari Mutations waise hi rahengi)
  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createUser(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User created successfully'); handleClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e?.message || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiService.updateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); handleClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e?.message || 'Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e?.message || 'Failed to delete user'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiService.toggleUserStatus(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Status updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || 'Failed to toggle status'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: any) => apiService.assignRoleInStore(userId, roleId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Role assigned'); setShowRoleModal(false); },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || 'Failed to assign role'),
  });

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', mobile: '', password: '', roleId: '' });
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email || '', mobile: user.mobile || '', password: '', roleId: '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: { name: formData.name, email: formData.email, mobile: formData.mobile } });
    } else {
      if (!formData.password) { toast.error('Password is required'); return; }
      createMutation.mutate(formData);
    }
  };

  const users = usersData?.DDMS_data || [];

  // FIX: Dropdown se SUPER_ADMIN ko filter kar diya taaki Store Admin ise select na kar sake
  const roles = (rolesData?.DDMS_data || []).filter(
    (role: any) => role.name.toUpperCase() !== 'SUPER_ADMIN'
  );

  const filtered = users.filter((u: any) =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile?.includes(searchTerm) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="animate-pulse p-6">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('navigation.users')}</h1>
        {canCreate('users') && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create User
          </Button>
        )}
      </div>

      {/* Users Table Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Users ({filtered.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <Input placeholder="Search by name, mobile, email..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Mobile</th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">Role</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Setup</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center text-secondary-500 py-8">No users found</td></tr>
              ) : filtered.map((user: any) => (
                <tr key={user.id} className="hover:bg-secondary-50">
                  <td className="table-cell font-medium">
                    <div className="flex items-center"><User className="w-4 h-4 mr-2 text-secondary-400" />{user.name}</div>
                  </td>
                  <td className="table-cell">{user.mobile || '-'}</td>
                  <td className="table-cell text-sm text-secondary-600">{user.email || '-'}</td>
                  <td className="table-cell">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{user.role_name || '-'}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {user.first_login
                      ? <span className="text-xs text-orange-600">Pending setup</span>
                      : <span className="text-xs text-green-600">Done</span>}
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-1">
                      {canUpdate('users') && (
                        <>
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Assign Role"
                            onClick={() => { setSelectedUser(user); setSelectedRoleId(''); setShowRoleModal(true); }}>
                            <Shield className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm"
                            title={String(user.id) === String(currentUser?.id) ? "You can't deactivate your own account" : "Toggle Active"}
                            disabled={String(user.id) === String(currentUser?.id)}
                            onClick={() => toggleMutation.mutate(String(user.id))}>
                            {user.active
                              ? <ToggleRight className="w-4 h-4 text-green-500" />
                              : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                          </Button>
                        </>
                      )}
                      {canDelete('users') && (
                        <Button variant="ghost" size="sm"
                          onClick={() => { if (window.confirm('Delete this user?')) deleteMutation.mutate(String(user.id)); }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={handleClose} title={editingUser ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Mobile Number" type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="10-digit mobile number" />
          <Input label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="user@example.com" />
          {!editingUser && (
            <>
              <Input label="Password *" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Minimum 6 characters" required />
              <Select label="Assign Role" value={formData.roleId} onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}>
                <option value="">Select role (optional)</option>
                {/* Roles list filtered above is used here */}
                {roles.map((role: any) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </Select>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={`Assign Role — ${selectedUser?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-secondary-600">Select a role for this user in the current store:</p>
          <Select label="Role *" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
            <option value="">Select role</option>
            {/* Roles list filtered above is used here too */}
            {roles.map((role: any) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!selectedRoleId) { toast.error('Select a role'); return; }
              assignRoleMutation.mutate({ userId: String(selectedUser.id), roleId: selectedRoleId });
            }} disabled={assignRoleMutation.isPending}>
              Assign Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
