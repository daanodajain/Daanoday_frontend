import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { Receipt } from '@/types';
import toast from 'react-hot-toast';

interface Props { isOpen: boolean; onClose: () => void; receipt: Receipt | null; }

export const EditReceiptModal: React.FC<Props> = ({ isOpen, onClose, receipt }) => {
  const queryClient = useQueryClient();
  const [newAmount, setNewAmount] = useState('');
  const [newPaymentMode, setNewPaymentMode] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (receipt && isOpen) {
      setNewAmount(String(receipt.total_amount));
      setNewPaymentMode(receipt.payment_mode);
      setReason('');
    }
  }, [receipt, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiService.createChangeRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Change request submitted for approval');
      onClose();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to submit change request'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    if (!receipt) return;
    mutation.mutate({
      entityType: 'RECEIPT',
      entityId: receipt.id,
      action: 'UPDATE',
      reason,
      newData: {
        total_amount: Number(newAmount),
        payment_mode: newPaymentMode,
      },
    });
  };

  if (!receipt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Receipt Update" size="md">
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-4">
        Direct edits are not allowed. This will create a change request that requires Store Admin approval.
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-secondary-50 p-3 rounded text-sm">
          <p><strong>Receipt:</strong> {receipt.receipt_number}</p>
          <p><strong>Customer:</strong> {receipt.customer_name}</p>
          <p><strong>Current Amount:</strong> ₹{Number(receipt.total_amount).toLocaleString()}</p>
        </div>
        <Input label="New Total Amount" type="number" value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)} required />
        <Select label="New Payment Mode" value={newPaymentMode}
          onChange={(e) => setNewPaymentMode(e.target.value)}>
          <option value="CASH">Cash</option>
          <option value="CHEQUE">Cheque</option>
          <option value="ONLINE">Online</option>
        </Select>
        <div>
          <label className="form-label">Reason for Change *</label>
          <textarea className="input w-full h-20 resize-none" placeholder="Explain why this change is needed..."
            value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting...' : 'Submit Change Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
