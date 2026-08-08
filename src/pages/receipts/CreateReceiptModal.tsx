import React, { useState, useRef, useEffect } from 'react';
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

const today = () => new Date().toISOString().split('T')[0];

export const CreateReceiptModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const [receiptDate, setReceiptDate] = useState(today());
  const [isDue, setIsDue] = useState(false);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(today());
  const [remarks, setRemarks] = useState('');
  const [particulars, setParticulars] = useState<Particular[]>([]);

  const { data: particularsList } = useQuery({
    queryKey: ['particulars', 'RECEIPT'],
    queryFn: () => apiService.getParticulars('RECEIPT'),
    enabled: isOpen,
  });

  // Customer search autocomplete
  const { data: searchData, refetch: searchCustomers } = useQuery({
    queryKey: ['customer-search', customerMobile],
    queryFn: () => apiService.get(`/customers/search?q=${customerMobile}`),
    enabled: false,
  });

  useEffect(() => {
    if (customerMobile.length >= 3) {
      searchCustomers().then((res) => {
        const results = res?.data?.DDMS_data || [];
        setCustomerSuggestions(results);
        setShowSuggestions(results.length > 0);
      });
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customerMobile]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectCustomer = (c: any) => {
    setCustomerMobile(c.mobile);
    setCustomerName(c.name);
    setSelectedCustomerId(c.id);
    setShowSuggestions(false);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiService.createReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt created successfully');
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.DDMS_error_code || 'Failed to create receipt'),
  });

  const addParticular = () => setParticulars([...particulars, { particularId: '', particularName: '', amount: 0 }]);
  const removeParticular = (i: number) => setParticulars(particulars.filter((_, idx) => idx !== i));

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
    if (!customerMobile || !customerName) {
      toast.error('Customer mobile and name required');
      return;
    }
    if (particulars.length === 0 || particulars.some(p => !p.particularId || !p.amount)) {
      toast.error('Add at least one particular with amount');
      return;
    }
    createMutation.mutate({
      customerMobile,
      customerName,
      receiptDate,
      isDue,
      paymentMode: isDue ? null : paymentMode,
      paymentDate: isDue ? null : paymentDate,
      remarks: remarks || null,
      totalAmount,
      particulars: particulars.map(p => ({
        particularId: p.particularId,
        particularName: p.particularName,
        amount: Number(p.amount),
      })),
    });
  };

  const handleClose = () => {
    setCustomerMobile('');
    setCustomerName('');
    setSelectedCustomerId(null);
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setReceiptDate(today());
    setIsDue(false);
    setPaymentMode('CASH');
    setPaymentDate(today());
    setRemarks('');
    setParticulars([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Receipt" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative" ref={suggestRef}>
            <Input
              label="Customer Mobile *"
              type="tel"
              value={customerMobile}
              onChange={(e) => {
                setCustomerMobile(e.target.value);
                setSelectedCustomerId(null);
                setCustomerName('');
              }}
              placeholder="Enter mobile to search"
              autoComplete="off"
            />
            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {customerSuggestions.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-secondary-50 border-b border-secondary-100 last:border-0"
                    onClick={() => handleSelectCustomer(c)}
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-secondary-500">{c.mobile} · {c.account_number}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            label="Customer Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        {/* Receipt Date */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Receipt Date *"
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            max={today()}
          />
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary-600"
                checked={isDue}
                onChange={(e) => setIsDue(e.target.checked)}
              />
              <span className="text-sm font-medium text-secondary-700">Due Receipt (payment pending)</span>
            </label>
          </div>
        </div>

        {/* Payment — only if NOT due */}
        {!isDue && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-secondary-50 rounded-lg">
            <Select
              label="Payment Mode *"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </Select>
            <Input
              label="Payment Date *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={today()}
            />
          </div>
        )}

        {isDue && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Due receipt — payment mode and date will not be recorded. Status will be UNPAID.
          </div>
        )}

        {/* Particulars */}
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
                  <Select
                    label={index === 0 ? 'Item' : ''}
                    value={p.particularId}
                    onChange={(e) => updateParticular(index, 'particularId', e.target.value)}
                    required
                  >
                    <option value="">Select Item</option>
                    {(particularsList?.DDMS_data || []).map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-32">
                  <Input
                    label={index === 0 ? 'Amount (₹)' : ''}
                    type="number"
                    min="1"
                    value={p.amount || ''}
                    onChange={(e) => updateParticular(index, 'amount', Number(e.target.value))}
                    required
                  />
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
              <span className="text-lg text-primary-600">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Remarks (optional)</label>
          <textarea
            className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Birthday donation, Annual pooja..."
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Receipt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
