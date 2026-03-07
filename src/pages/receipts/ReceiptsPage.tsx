import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, Download, Eye, Edit, Check } from 'lucide-react';
import toast from 'react-hot-toast';

import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { Receipt } from '@/types';
import { CreateReceiptModal } from './CreateReceiptModal';
import { EditReceiptModal } from './EditReceiptModal';

export const ReceiptsPage: React.FC = () => {
  const { t } = useTranslation();
  const { canCreate, canUpdate, canApprove } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts', searchTerm],
    queryFn: () => apiService.getReceipts({ search: searchTerm }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-100';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-100';
      case 'UNPAID': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-secondary-900">{t('navigation.receipts')}</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary-200 rounded"></div>
          ))}
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
            <CardTitle>{t('receipt.receiptNumber')}</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {t('common.filter')}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                {t('common.export')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">{t('receipt.receiptNumber')}</th>
                <th className="table-header-cell">{t('receipt.date')}</th>
                <th className="table-header-cell">{t('receipt.customer')}</th>
                <th className="table-header-cell">{t('receipt.totalAmount')}</th>
                <th className="table-header-cell">{t('receipt.status')}</th>
                <th className="table-header-cell">{t('receipt.paymentMode')}</th>
                <th className="table-header-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {receipts?.DDMS_data?.receipts?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-8 text-secondary-500">
                    {t('receipt.noReceipts')}
                  </td>
                </tr>
              ) : (
                receipts?.DDMS_data?.receipts?.map((receipt: Receipt) => (
                  <tr key={receipt.id} className="hover:bg-secondary-50">
                    <td className="table-cell font-medium">{receipt.receiptNumber}</td>
                    <td className="table-cell">{new Date(receipt.date).toLocaleDateString()}</td>
                    <td className="table-cell">{receipt.customerName}</td>
                    <td className="table-cell">₹{receipt.totalAmount.toLocaleString()}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {t(`receipt.${receipt.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="table-cell">{receipt.paymentMode ? t(`receipt.${receipt.paymentMode.toLowerCase()}`) : '-'}</td>
                    <td className="table-cell">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedReceipt(receipt)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canUpdate('receipts') && (
                          <Button variant="ghost" size="sm" onClick={() => setEditingReceipt(receipt)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canApprove('RECEIPT') && receipt.status === 'PENDING' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:text-green-700"
                              onClick={async () => {
                                try {
                                  await apiService.approveReceipt(receipt.id);
                                  toast.success('Receipt approved');
                                  window.location.reload();
                                } catch (error) {
                                  toast.error('Failed to approve');
                                }
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={async () => {
                                try {
                                  await apiService.rejectReceipt(receipt.id);
                                  toast.success('Receipt rejected');
                                  window.location.reload();
                                } catch (error) {
                                  toast.error('Failed to reject');
                                }
                              }}
                            >
                              X
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

      {/* Create Receipt Modal */}
      <CreateReceiptModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Receipt Modal */}
      <EditReceiptModal
        isOpen={!!editingReceipt}
        onClose={() => setEditingReceipt(null)}
        receipt={editingReceipt}
      />

      {/* View Receipt Modal */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={`Receipt ${selectedReceipt?.receiptNumber}`}
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">{t('receipt.date')}</label>
                <p>{new Date(selectedReceipt.date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="form-label">{t('receipt.customer')}</label>
                <p>{selectedReceipt.customerName}</p>
              </div>
              <div>
                <label className="form-label">{t('receipt.totalAmount')}</label>
                <p>₹{selectedReceipt.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <label className="form-label">{t('receipt.status')}</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReceipt.status)}`}>
                  {t(`receipt.${selectedReceipt.status.toLowerCase()}`)}
                </span>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                {t('common.close')}
              </Button>
              <Button>
                {t('receipt.printReceipt')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};