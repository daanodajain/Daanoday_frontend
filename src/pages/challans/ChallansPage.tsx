import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, FileEdit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Challan } from '@/types';
import toast from 'react-hot-toast';

const statusColor: Record<string, string> = {
  PAID: 'text-green-700 bg-green-100',
  UNPAID: 'text-red-700 bg-red-100',
  CANCELLED: 'text-gray-600 bg-gray-100',
};

interface Particular { particularId: string; particularName: string; amount: number; }

export const ChallansPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canApprove } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [changeRequestModal, setChangeRequestModal] = useState<{ challan: Challan; action: 'UPDATE' | 'DELETE' } | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [formData, setFormData] = useState({ supplierId: '', paymentMode: 'CASH' });
  const [particulars, setParticulars] = useState<Particular[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['challans', searchTerm],
    queryFn: () => apiService.getChallans({ search: searchTerm }),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiService.getSuppliers(),
    enabled: showCreateModal,
  });

  const { data: particularsList } = useQuery({
    queryKey: ['particulars', 'CHALLAN'],
    queryFn: () => apiService.getParticulars('CHALLAN'),
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createChallan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      toast.success('Challan created successfully');
      handleCloseCreate();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create challan'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiService.approveChallan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      toast.success('Challan marked as paid ✅');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to approve challan'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiService.rejectChallan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      toast.success('Challan cancelled');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to reject challan'),
  });

  const changeRequestMutation = useMutation({
    mutationFn: (data: any) => apiService.createChangeRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      toast.success('Change request submitted for approval');
      setChangeRequestModal(null);
      setChangeReason('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to submit change request'),
  });

  const addParticular = () => setParticulars([...particulars, { particularId: '', particularName: '', amount: 0 }]);
  const removeParticular = (i: number) => setParticulars(particulars.filter((_, idx) => idx !== i));
  const updateParticular = (i: number, field: keyof Particular, value: any) => {
    const updated = [...particulars];
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'particularId') {
      const p = (particularsList?.DDMS_data || []).find((p: any) => String(p.id) === String(value));
      if (p) updated[i].particularName = p.name;
    }
    setParticulars(updated);
  };

  const totalAmount = particulars.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) { toast.error('Select a supplier'); return; }
    if (particulars.length === 0) { toast.error('Add at least one particular'); return; }
    createMutation.mutate({
      supplierId: formData.supplierId,
      paymentMode: formData.paymentMode,
      totalAmount,
      particulars: particulars.map(p => ({ particularId: p.particularId, particularName: p.particularName, amount: Number(p.amount) })),
    });
  };

  const handleCloseCreate = () => {
    setFormData({ supplierId: '', paymentMode: 'CASH' });
    setParticulars([]);
    setShowCreateModal(false);
  };

  const challans: Challan[] = data?.DDMS_data?.challans || data?.DDMS_data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-secondary-900">Challans</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-900">Challans</h1>
        {canCreate('challans') && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Challan
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Challans ({challans.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <Input placeholder={t('common.search')} value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Challan #</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Supplier</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Payment</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {challans.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center py-8 text-secondary-500">No challans found</td></tr>
              ) : (
                challans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-secondary-50">
                    <td className="table-cell font-medium">{challan.challan_number}</td>
                    <td className="table-cell">{new Date(challan.created_at).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium">{challan.supplier_name}</p>
                        {challan.supplier_mobile && <p className="text-xs text-secondary-500">{challan.supplier_mobile}</p>}
                      </div>
                    </td>
                    <td className="table-cell font-medium">₹{Number(challan.total_amount).toLocaleString()}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[challan.status] || 'text-gray-600 bg-gray-100'}`}>
                        {challan.status}
                      </span>
                    </td>
                    <td className="table-cell">{challan.payment_mode}</td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedChallan(challan)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {challan.status === 'UNPAID' && canApprove('challans') && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600"
                              onClick={() => approveMutation.mutate(String(challan.id))}
                              disabled={approveMutation.isPending}>
                              ✓
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600"
                              onClick={() => rejectMutation.mutate(String(challan.id))}
                              disabled={rejectMutation.isPending}>
                              ✗
                            </Button>
                          </>
                        )}
                        {challan.status !== 'CANCELLED' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-blue-600"
                              onClick={() => setChangeRequestModal({ challan, action: 'UPDATE' })}>
                              <FileEdit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600"
                              onClick={() => setChangeRequestModal({ challan, action: 'DELETE' })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={handleCloseCreate} title="Create Challan" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Supplier *" value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} required>
              <option value="">Select Supplier</option>
              {(suppliers?.DDMS_data || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select label="Payment Mode *" value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </Select>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Particulars</h3>
              <Button type="button" size="sm" onClick={addParticular}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {particulars.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select label={i === 0 ? 'Item' : ''} value={p.particularId}
                      onChange={(e) => updateParticular(i, 'particularId', e.target.value)} required>
                      <option value="">Select Item</option>
                      {(particularsList?.DDMS_data || []).map((item: any) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-32">
                    <Input label={i === 0 ? 'Amount' : ''} type="number" value={p.amount || ''}
                      onChange={(e) => updateParticular(i, 'amount', Number(e.target.value))} required />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeParticular(i)} className="mb-1">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            {particulars.length > 0 && (
              <div className="mt-3 pt-3 border-t flex justify-between font-semibold">
                <span>Total:</span><span className="text-lg">₹{totalAmount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCloseCreate}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!selectedChallan} onClose={() => setSelectedChallan(null)}
        title={`Challan ${selectedChallan?.challan_number}`} size="lg">
        {selectedChallan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Supplier</label><p>{selectedChallan.supplier_name}</p></div>
              <div><label className="form-label">Amount</label><p className="font-bold text-lg">₹{Number(selectedChallan.total_amount).toLocaleString()}</p></div>
              <div><label className="form-label">Payment Mode</label><p>{selectedChallan.payment_mode}</p></div>
              <div><label className="form-label">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[selectedChallan.status]}`}>{selectedChallan.status}</span>
              </div>
            </div>
            {selectedChallan.particulars && selectedChallan.particulars.length > 0 && (
              <div>
                <label className="form-label">Particulars</label>
                <table className="w-full text-sm mt-1">
                  <thead><tr className="border-b"><th className="text-left py-1">Item</th><th className="text-right py-1">Amount</th></tr></thead>
                  <tbody>
                    {selectedChallan.particulars.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-1">{p.particular_name}</td>
                        <td className="py-1 text-right">₹{Number(p.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedChallan(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Change Request Modal */}
      <Modal isOpen={!!changeRequestModal} onClose={() => { setChangeRequestModal(null); setChangeReason(''); }}
        title={changeRequestModal?.action === 'DELETE' ? 'Request Challan Cancellation' : 'Request Challan Update'} size="md">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            This will create a change request that requires approval from your Store Admin.
          </div>
          <div>
            <label className="form-label">Reason *</label>
            <textarea className="input w-full h-20 resize-none" placeholder="Explain why this change is needed..."
              value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setChangeRequestModal(null); setChangeReason(''); }}>Cancel</Button>
            <Button onClick={() => {
              if (!changeRequestModal || !changeReason.trim()) { toast.error('Reason is required'); return; }
              changeRequestMutation.mutate({
                entityType: 'CHALLAN',
                entityId: changeRequestModal.challan.id,
                action: changeRequestModal.action,
                reason: changeReason,
              });
            }} disabled={changeRequestMutation.isPending}>
              {changeRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
