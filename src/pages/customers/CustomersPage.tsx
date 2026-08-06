import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', mobile: '' });

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => apiService.getCustomers(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createCustomer(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer created'); handleClose(); },
    onError: (e: any) => toast.error(e.message || 'Failed to create customer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiService.updateCustomer(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer updated'); handleClose(); },
    onError: (e: any) => toast.error(e.message || 'Failed to update customer'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteCustomer(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer deleted'); },
    onError: (e: any) => toast.error(e.message || 'Failed to delete customer'),
  });

  const handleClose = () => { setShowModal(false); setEditingCustomer(null); setFormData({ name: '', mobile: '' }); };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, mobile: customer.mobile });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) updateMutation.mutate({ id: String(editingCustomer.id), data: formData });
    else createMutation.mutate(formData);
  };

  const customers = customersData?.DDMS_data || [];
  const filtered = customers.filter((c: any) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile?.includes(searchTerm) ||
    c.account_number?.includes(searchTerm)
  );

  if (isLoading) return <div className="animate-pulse p-6">Loading customers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('navigation.customers')}</h1>
        {canCreate('customers') && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> {t('customer.createCustomer')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('navigation.customers')} ({filtered.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <Input placeholder={t('common.search')} value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Account #</th>
                <th className="table-header-cell">{t('customer.name')}</th>
                <th className="table-header-cell">{t('customer.mobile')}</th>
                <th className="table-header-cell">First Login</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-secondary-50">
                  <td className="table-cell font-medium text-primary-700">{customer.account_number}</td>
                  <td className="table-cell">
                    <div className="flex items-center"><User className="w-4 h-4 mr-2 text-secondary-400" />{customer.name}</div>
                  </td>
                  <td className="table-cell">{customer.mobile}</td>
                  <td className="table-cell">
                    {customer.first_login
                      ? <span className="text-xs text-orange-600">Pending setup</span>
                      : <span className="text-xs text-green-600">Done</span>}
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      {canUpdate('customers') && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete('customers') && (
                        <Button variant="ghost" size="sm"
                          onClick={() => { if (window.confirm('Delete this customer?')) deleteMutation.mutate(String(customer.id)); }}>
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

      <Modal isOpen={showModal} onClose={handleClose}
        title={editingCustomer ? 'Edit Customer' : t('customer.createCustomer')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={`${t('customer.name')} *`} value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label={`${t('customer.mobile')} *`} type="tel" value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
