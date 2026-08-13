import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

interface SupplierFormData {
  id?: number;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierFormData | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiService.getSuppliers(),
  });

  const createMutation = useMutation({
    mutationFn: (data: SupplierFormData) => apiService.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to create supplier'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: SupplierFormData) => apiService.updateSupplier(data.id!.toString(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update supplier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteSupplier(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: () => toast.error('Failed to delete supplier'),
  });

  const handleCreate = () => {
    setEditingSupplier(null);
    setFormData({ companyName: '', contactPerson: '', phone: '', email: '', address: '' });
    setShowModal(true);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      id: supplier.id,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSuppliers = suppliers?.DDMS_data?.filter((supplier: any) =>
    supplier.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('navigation.suppliers')}</h1>
        {canCreate('suppliers') && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Supplier
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Suppliers ({suppliers?.DDMS_data?.length || 0})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Company Name</th>
                <th className="table-header-cell">Contact Person</th>
                <th className="table-header-cell">Phone</th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">Address</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers?.map((supplier: any) => (
                <tr key={supplier.id} className="hover:bg-secondary-50">
                  <td className="table-cell font-medium">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-secondary-400" />
                      {supplier.companyName}
                    </div>
                  </td>
                  <td className="table-cell">{supplier.contactPerson}</td>
                  <td className="table-cell">{supplier.phone}</td>
                  <td className="table-cell">{supplier.email || '-'}</td>
                  <td className="table-cell">{supplier.address || '-'}</td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      {canUpdate('suppliers') && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete('suppliers') && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id)}>
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

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingSupplier ? 'Edit Supplier' : 'Create Supplier'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company Name *"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
          />
          <Input
            label="Contact Person *"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            required
          />
          <Input
            label="Phone *"
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setFormData({ ...formData, phone: val });
            }}
            placeholder="10-digit phone number"
            maxLength={10}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
