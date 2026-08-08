import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

interface ParticularFormData {
  id?: number;
  name: string;
  type: 'RECEIPT' | 'CHALLAN';
}

export const ParticularsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RECEIPT' | 'CHALLAN'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingParticular, setEditingParticular] = useState<ParticularFormData | null>(null);
  const [formData, setFormData] = useState<ParticularFormData>({
    name: '',
    type: 'RECEIPT',
  });

  const { data: particulars, isLoading } = useQuery({
    queryKey: ['particulars', filterType],
    queryFn: () => apiService.getParticulars(filterType === 'ALL' ? undefined : filterType),
  });

  const createMutation = useMutation({
    mutationFn: (data: ParticularFormData) => apiService.createParticular(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['particulars'] });
      toast.success('Particular created successfully');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to create particular'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ParticularFormData) => apiService.updateParticular(data.id!.toString(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['particulars'] });
      toast.success('Particular updated successfully');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update particular'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteParticular(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['particulars'] });
      toast.success('Particular deleted successfully');
    },
    onError: () => toast.error('Failed to delete particular'),
  });

  const handleCreate = () => {
    setEditingParticular(null);
    setFormData({ name: '', type: 'RECEIPT' });
    setShowModal(true);
  };

  const handleEdit = (particular: any) => {
    setEditingParticular(particular);
    setFormData({
      id: particular.id,
      name: particular.name,
      type: particular.type,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingParticular(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParticular) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this particular?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredParticulars = (particulars?.DDMS_data || [])?.filter((particular: any) =>
    particular.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading particulars...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Particulars Management</h1>
        {canCreate('particulars') && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Particular
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Particulars ({filteredParticulars?.length || 0})</CardTitle>
            <div className="flex gap-2">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="ALL">All Types</option>
                <option value="RECEIPT">Receipt</option>
                <option value="CHALLAN">Challan</option>
              </Select>
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
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticulars?.map((particular: any) => (
                <tr key={particular.id} className="hover:bg-secondary-50">
                  <td className="table-cell font-medium">
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-2 text-secondary-400" />
                      {particular.name}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      particular.type === 'RECEIPT' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {particular.type}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      particular.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {particular.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      {canUpdate('particulars') && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(particular)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete('particulars') && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(particular.id)}>
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
        title={editingParticular ? 'Edit Particular' : 'Create Particular'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Type *"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            required
          >
            <option value="RECEIPT">Receipt</option>
            <option value="CHALLAN">Challan</option>
          </Select>
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
