import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface Props { isOpen: boolean; onClose: () => void; }
interface Particular { particularId: string; particularName: string; amount: number; }

export const CreateReceiptModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customerMobile: '',
    customerName: '',
    paymentMode: 'CASH',
  });
  const [particulars, setParticulars] = useState<Particular[]>([]);

  const { data: particularsList } = useQuery({
    queryKey: ['particulars', 'RECEIPT'],
    queryFn: () => apiService.getParticulars('RECEIPT'),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt created successfully');
      handleClose();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create receipt'),
  });

  const addParticular = () => setParticulars([...particulars, { particularId: '', particularName: '', amount: 0 }]);

  const removeParticular = (index: number) => setParticulars(particulars.filter((_, i) => i !== index));

  const updateParticular = (index: number, field: keyof Particular, value: any) => {
    const updated = [...particulars];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'particularId') {
      const p = (particularsList?.DDMS_data || []).find((p: any) => String(p.id) === String(value));
      if (p) updated[index].particularName = p.name;
    }
    setParticulars(updated);
  };

  const totalAmount = particulars.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerMobile || !formData.customerName) {
      toast.error('Customer mobile and name are required');
      return;
    }
    if (particulars.length === 0 || particulars.some(p => !p.particularId || !p.amount)) {
      toast.error('Please add at least one particular with amount');
      return;
    }
    createMutation.mutate({
      customerMobile: formData.customerMobile,
      customerName: formData.customerName,
      paymentMode: formData.paymentMode,
      totalAmount,
      particulars: particulars.map(p => ({ particularId: p.particularId, particularName: p.particularName, amount: Number(p.amount) })),
    });
  };

  const handleClose = () => {
    setFormData({ customerMobile: '', customerName: '', paymentMode: 'CASH' });
    setParticulars([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('receipt.createReceipt')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Customer Mobile *" type="tel" value={formData.customerMobile}
            onChange={(e) => setFormData({ ...formData, customerMobile: e.target.value })}
            placeholder="10-digit mobile" required />
          <Input label="Customer Name *" value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            placeholder="Full name" required />
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
            {particulars.map((p, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select label={index === 0 ? 'Item' : ''} value={p.particularId}
                    onChange={(e) => updateParticular(index, 'particularId', e.target.value)} required>
                    <option value="">Select Item</option>
                    {(particularsList?.DDMS_data || []).map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-32">
                  <Input label={index === 0 ? 'Amount' : ''} type="number" value={p.amount || ''}
                    onChange={(e) => updateParticular(index, 'amount', Number(e.target.value))} required />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeParticular(index)} className="mb-1">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          {particulars.length > 0 && (
            <div className="mt-3 pt-3 border-t flex justify-between font-semibold">
              <span>Total:</span>
              <span className="text-lg">₹{totalAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
