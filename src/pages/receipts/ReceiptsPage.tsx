import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Check, X, FileEdit, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { Receipt } from '@/types';
import { CreateReceiptModal } from './CreateReceiptModal';

const stateColor: Record<string, string> = {
  PENDING_APPROVAL: 'text-yellow-700 bg-yellow-100',
  APPROVED: 'text-green-700 bg-green-100',
  REJECTED: 'text-red-700 bg-red-100',
  CANCELLED: 'text-gray-600 bg-gray-100',
  DRAFT: 'text-blue-700 bg-blue-100',
};

export const ReceiptsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canApprove } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [changeRequestModal, setChangeRequestModal] = useState<{ receipt: Receipt; action: 'UPDATE' | 'DELETE' } | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [newData, setNewData] = useState<any>({});
  const [editParticulars, setEditParticulars] = useState<{ particularId: string; particularName: string; amount: number; paidAmount: number }[]>([]);
  const [collectModal, setCollectModal] = useState<Receipt | null>(null);
  const [collectPaymentMode, setCollectPaymentMode] = useState('CASH');

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', searchTerm],
    queryFn: () => apiService.getReceipts({ search: searchTerm }),
  });

  const { data: particularsList } = useQuery({
    queryKey: ['particulars', 'RECEIPT'],
    queryFn: () => apiService.getParticulars('RECEIPT'),
    enabled: !!changeRequestModal,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiService.approveReceipt(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['receipts'] }); toast.success('Receipt approved'); },
    onError: (e: any) => toast.error(e.message || 'Failed to approve'),
  });

  const collectRemainingMutation = useMutation({
    mutationFn: ({ id, paymentMode }: { id: string; paymentMode: string }) =>
      apiService.collectRemaining(id, { paymentMode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Remaining amount collected — receipt fully paid');
      setCollectModal(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || e.message || 'Failed to collect remaining amount'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiService.rejectReceipt(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['receipts'] }); toast.success('Receipt rejected'); },
    onError: (e: any) => toast.error(e.message || 'Failed to reject'),
  });

  const handleDownloadPdf = async (receipt: Receipt) => {
    try {
      const blob = await apiService.generateReceiptPDF(String(receipt.id));
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receipt.receipt_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Failed to download receipt PDF');
    }
  };

  const changeRequestMutation = useMutation({
    mutationFn: (data: any) => apiService.createChangeRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Change request submitted for approval');
      setChangeRequestModal(null);
      setChangeReason('');
      setNewData({});
    },
    onError: (e: any) => toast.error(e.message || 'Failed to submit change request'),
  });

  const handleChangeRequest = () => {
    if (!changeRequestModal || !changeReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    let payload = newData;
    if (changeRequestModal.action === 'UPDATE') {
      const totalAmount = editParticulars.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      if (editParticulars.some(p => !p.particularId || !p.amount)) {
        toast.error('Every particular needs an item and amount');
        return;
      }
      if (editParticulars.some(p => Number(p.paidAmount) > Number(p.amount) || Number(p.paidAmount) < 0)) {
        toast.error('Paid amount per item cannot be negative or exceed that item\'s amount');
        return;
      }
      payload = {
        ...newData,
        total_amount: totalAmount,
        particulars: editParticulars.map(p => ({
          particularId: p.particularId,
          particularName: p.particularName,
          amount: Number(p.amount),
          paidAmount: Number(p.paidAmount),
        })),
      };
    }
    changeRequestMutation.mutate({
      entityType: 'RECEIPT',
      entityId: changeRequestModal.receipt.id,
      action: changeRequestModal.action,
      reason: changeReason,
      newData: changeRequestModal.action === 'UPDATE' ? payload : undefined,
    });
  };

  const receipts: Receipt[] = data?.DDMS_data?.receipts || data?.DDMS_data || [];

  const handleOpenEdit = async (receipt: Receipt) => {
    try {
      // List rows don't include particulars (only the single-receipt fetch
      // does) — fetch full detail first so the edit form isn't empty.
      const res = await apiService.get(`/receipts/${receipt.id}`);
      const full: Receipt = res.DDMS_data;
      setChangeRequestModal({ receipt: full, action: 'UPDATE' });
      setNewData({ payment_mode: full.payment_mode });
      setEditParticulars(
        (full.particulars || []).map(p => ({
          particularId: String(p.particular_id),
          particularName: p.particular_name,
          amount: Number(p.amount),
          paidAmount: Number(p.paid_amount ?? p.amount),
        }))
      );
    } catch (e: any) {
      toast.error('Failed to load receipt details for editing');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-secondary-900">{t('navigation.receipts')}</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-900">{t('navigation.receipts')}</h1>
        {canCreate('receipts') && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('receipt.createReceipt')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Receipts ({receipts.length})</CardTitle>
            <div className="relative w-full sm:w-64">
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
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Receipt #</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Customer</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">State</th>
                <th className="table-header-cell">Payment</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-8 text-secondary-500">No receipts found</td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-secondary-50">
                    <td className="table-cell font-medium">{receipt.receipt_number}</td>
                    <td className="table-cell">{new Date(receipt.created_at).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium">{receipt.customer_name}</p>
                        <p className="text-xs text-secondary-500">{receipt.customer_mobile}</p>
                      </div>
                    </td>
                    <td className="table-cell font-medium">₹{Number(receipt.total_amount).toLocaleString()}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateColor[receipt.receipt_state] || 'text-gray-600 bg-gray-100'}`}>
                        {receipt.receipt_state}
                      </span>
                    </td>
                    <td className="table-cell">
                      {receipt.payment_mode}
                      {receipt.status === 'PARTIAL' && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium text-amber-700 bg-amber-100">
                          PARTIAL — ₹{(Number(receipt.total_amount) - Number(receipt.paid_amount || 0)).toLocaleString()} due
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedReceipt(receipt)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Download PDF" onClick={() => handleDownloadPdf(receipt)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        {receipt.status === 'PARTIAL' && canApprove('RECEIPT') && (
                          <Button variant="ghost" size="sm" className="text-amber-600" title="Collect Remaining"
                            onClick={() => { setCollectModal(receipt); setCollectPaymentMode(receipt.payment_mode || 'CASH'); }}>
                            <span className="text-xs font-medium px-1">Collect</span>
                          </Button>
                        )}
                        {canApprove('RECEIPT') && receipt.receipt_state === 'PENDING_APPROVAL' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600" title="Approve"
                              onClick={() => approveMutation.mutate(receipt.id)}
                              disabled={approveMutation.isPending}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" title="Reject"
                              onClick={() => rejectMutation.mutate(receipt.id)}
                              disabled={rejectMutation.isPending}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {receipt.receipt_state !== 'CANCELLED' && receipt.receipt_state !== 'REJECTED' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-blue-600" title="Edit"
                              onClick={() => handleOpenEdit(receipt)}>
                              <FileEdit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" title="Delete"
                              onClick={() => setChangeRequestModal({ receipt, action: 'DELETE' })}>
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

      <CreateReceiptModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Collect Remaining Modal */}
      <Modal isOpen={!!collectModal} onClose={() => setCollectModal(null)} title="Collect Remaining Amount">
        {collectModal && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Total Amount</span>
              <span className="font-medium">₹{Number(collectModal.total_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Already Paid</span>
              <span className="font-medium">₹{Number(collectModal.paid_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base border-t pt-2">
              <span className="font-medium">Remaining Due</span>
              <span className="font-bold text-amber-700">
                ₹{(Number(collectModal.total_amount) - Number(collectModal.paid_amount || 0)).toLocaleString()}
              </span>
            </div>
            <div>
              <label className="form-label">Payment Mode</label>
              <select className="form-input" value={collectPaymentMode} onChange={(e) => setCollectPaymentMode(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={() => setCollectModal(null)}>Cancel</Button>
              <Button
                onClick={() => collectRemainingMutation.mutate({ id: String(collectModal.id), paymentMode: collectPaymentMode })}
                disabled={collectRemainingMutation.isPending}>
                {collectRemainingMutation.isPending ? 'Collecting...' : 'Collect & Close Receipt'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)}
        title={`Receipt ${selectedReceipt?.receipt_number}`} size="lg">
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Customer</label><p>{selectedReceipt.customer_name} ({selectedReceipt.customer_mobile})</p></div>
              <div><label className="form-label">Account #</label><p>{selectedReceipt.account_number}</p></div>
              <div><label className="form-label">Amount</label><p className="font-bold text-lg">₹{Number(selectedReceipt.total_amount).toLocaleString()}</p></div>
              <div><label className="form-label">Payment Mode</label><p>{selectedReceipt.payment_mode}</p></div>
              {selectedReceipt.status === 'PARTIAL' && (
                <>
                  <div><label className="form-label">Paid Amount</label><p className="font-medium text-green-700">₹{Number(selectedReceipt.paid_amount || 0).toLocaleString()}</p></div>
                  <div><label className="form-label">Due Amount</label><p className="font-medium text-amber-700">₹{(Number(selectedReceipt.total_amount) - Number(selectedReceipt.paid_amount || 0)).toLocaleString()}</p></div>
                </>
              )}
              <div><label className="form-label">State</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateColor[selectedReceipt.receipt_state]}`}>
                  {selectedReceipt.receipt_state}
                </span>
              </div>
              <div><label className="form-label">Created By</label><p>{selectedReceipt.created_by_name}</p></div>
            </div>
            {selectedReceipt.particulars && selectedReceipt.particulars.length > 0 && (
              <div>
                <label className="form-label">Particulars</label>
                <table className="w-full text-sm mt-1">
                  <thead><tr className="border-b"><th className="text-left py-1">Item</th><th className="text-right py-1">Amount</th>{selectedReceipt.status === 'PARTIAL' && <th className="text-right py-1">Paid</th>}</tr></thead>
                  <tbody>
                    {selectedReceipt.particulars.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-1">{p.particular_name}</td>
                        <td className="py-1 text-right">₹{Number(p.amount).toLocaleString()}</td>
                        {selectedReceipt.status === 'PARTIAL' && <td className="py-1 text-right">₹{Number(p.paid_amount).toLocaleString()}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedReceipt.cancel_reason && (
              <div className="bg-red-50 p-3 rounded"><label className="form-label text-red-700">Cancel Reason</label><p>{selectedReceipt.cancel_reason}</p></div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedReceipt(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Change Request Modal */}
      <Modal isOpen={!!changeRequestModal} onClose={() => { setChangeRequestModal(null); setChangeReason(''); setNewData({}); }}
        title={changeRequestModal?.action === 'DELETE' ? 'Request Receipt Cancellation' : 'Request Receipt Update'} size="md">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            This will create a change request that requires approval from your Store Admin.
          </div>
          {changeRequestModal?.action === 'UPDATE' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="form-label mb-0">Particulars</label>
                <Button type="button" size="sm"
                  onClick={() => setEditParticulars([...editParticulars, { particularId: '', particularName: '', amount: 0, paidAmount: 0 }])}>
                  + Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {editParticulars.map((p, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <select
                        className="input w-full"
                        value={p.particularId}
                        onChange={(e) => {
                          const updated = [...editParticulars];
                          const item = (particularsList?.DDMS_data || []).find((x: any) => String(x.id) === e.target.value);
                          updated[index] = { ...updated[index], particularId: e.target.value, particularName: item?.name || '' };
                          setEditParticulars(updated);
                        }}
                      >
                        <option value="">Select Item</option>
                        {(particularsList?.DDMS_data || []).map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <Input type="number" min="1" placeholder="Amount" value={p.amount || ''}
                        onChange={(e) => {
                          const updated = [...editParticulars];
                          const amt = Number(e.target.value);
                          updated[index] = { ...updated[index], amount: amt, paidAmount: Math.min(updated[index].paidAmount, amt) };
                          setEditParticulars(updated);
                        }} />
                    </div>
                    <div className="w-24">
                      <Input type="number" min="0" max={p.amount || 0} placeholder="Paid" value={p.paidAmount ?? ''}
                        onChange={(e) => {
                          const updated = [...editParticulars];
                          updated[index] = { ...updated[index], paidAmount: Number(e.target.value) };
                          setEditParticulars(updated);
                        }} />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-red-500"
                      onClick={() => setEditParticulars(editParticulars.filter((_, i) => i !== index))}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              {editParticulars.length > 0 && (
                <div className="pt-2 border-t space-y-1 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>₹{editParticulars.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-secondary-600">
                    <span>Paid:</span>
                    <span>₹{editParticulars.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>Due:</span>
                    <span>
                      ₹{(editParticulars.reduce((s, p) => s + (Number(p.amount) || 0), 0)
                        - editParticulars.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="form-label">Reason *</label>
            <textarea className="input w-full h-20 resize-none" placeholder="Explain why this change is needed..."
              value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setChangeRequestModal(null); setChangeReason(''); }}>Cancel</Button>
            <Button onClick={handleChangeRequest} disabled={changeRequestMutation.isPending}>
              {changeRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
