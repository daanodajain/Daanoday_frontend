import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { ChangeRequest } from '@/types';
import toast from 'react-hot-toast';

const statusColor: Record<string, string> = {
  PENDING: 'text-yellow-700 bg-yellow-100',
  APPROVED: 'text-green-700 bg-green-100',
  REJECTED: 'text-red-700 bg-red-100',
};

// Parse old_data/new_data safely
const parseData = (d: any) => {
  if (!d) return null;
  if (typeof d === 'object') return d;
  try { return JSON.parse(d); } catch { return d; }
};

// Show only key fields from snapshot — not internal IDs
const RECEIPT_DISPLAY_FIELDS: Record<string, string> = {
  receipt_number: 'Receipt #',
  total_amount: 'Amount',
  payment_mode: 'Payment Mode',
  receipt_date: 'Receipt Date',
  payment_date: 'Payment Date',
  is_due: 'Due Receipt',
  remarks: 'Remarks',
  receipt_state: 'State',
  status: 'Status',
};

const CHALLAN_DISPLAY_FIELDS: Record<string, string> = {
  challan_number: 'Challan #',
  total_amount: 'Amount',
  payment_mode: 'Payment Mode',
  status: 'Status',
};

const DataDisplay = ({ data, entityType, label, bg = 'bg-secondary-50' }: { data: any; entityType: string; label: string; bg?: string }) => {
  const parsed = parseData(data);
  if (!parsed) return null;

  const fields = entityType === 'RECEIPT' ? RECEIPT_DISPLAY_FIELDS : CHALLAN_DISPLAY_FIELDS;
  const entries = Object.entries(fields)
    .filter(([key]) => parsed[key] !== undefined && parsed[key] !== null)
    .map(([key, label]) => {
      let val = parsed[key];
      if (key === 'total_amount') val = `₹${Number(val).toLocaleString('en-IN')}`;
      if (key === 'is_due') val = val ? 'Yes' : 'No';
      if ((key === 'receipt_date' || key === 'payment_date') && val) val = new Date(val).toLocaleDateString('en-IN');
      return { label, val };
    });

  if (!entries.length) return null;

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className={`${bg} p-3 rounded text-sm space-y-1 mt-1`}>
        {entries.map(({ label, val }) => (
          <div key={label} className="flex gap-2">
            <span className="text-secondary-500 w-32 shrink-0">{label}:</span>
            <span className="font-medium">{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChangeRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { canApprove } = usePermissions();
  const [selectedCR, setSelectedCR] = useState<ChangeRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['change-requests'],
    queryFn: () => apiService.getChangeRequests(),
  });

  // Extract error message from axios error
  const getError = (e: any) =>
    e?.response?.data?.DDMS_error_code || e?.response?.data?.DDMS_data || e?.message || 'Something went wrong';

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiService.approveChangeRequest(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      toast.success('Change request approved and applied');
      setSelectedCR(null); setReviewNote('');
    },
    onError: (e: any) => toast.error(getError(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiService.rejectChangeRequest(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      toast.success('Change request rejected');
      setSelectedCR(null); setReviewNote('');
    },
    onError: (e: any) => toast.error(getError(e)),
  });

  const handleReview = (action: 'approve' | 'reject') => {
    if (!selectedCR) return;
    if (action === 'reject' && !reviewNote.trim()) { toast.error('Review note required for rejection'); return; }
    const payload = { id: String(selectedCR.id), note: reviewNote };
    if (action === 'approve') approveMutation.mutate(payload);
    else rejectMutation.mutate(payload);
  };

  const changeRequests: ChangeRequest[] = data?.DDMS_data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-secondary-900">Change Requests</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Change Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Change Requests ({changeRequests.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Entity</th>
                <th className="table-header-cell">Action</th>
                <th className="table-header-cell">Requested By</th>
                <th className="table-header-cell">Reason</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {changeRequests.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center py-8 text-secondary-500">No change requests</td></tr>
              ) : (
                changeRequests.map((cr) => (
                  <tr key={cr.id} className="hover:bg-secondary-50">
                    <td className="table-cell">
                      <span className="font-medium">{cr.entity_type}</span>
                      <span className="text-xs text-secondary-500 ml-1">#{cr.entity_id}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${cr.action === 'DELETE' ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100'}`}>
                        {cr.action}
                      </span>
                    </td>
                    <td className="table-cell">{cr.requested_by_name}</td>
                    <td className="table-cell max-w-xs truncate">{cr.reason}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[cr.status]}`}>
                        {cr.status}
                      </span>
                    </td>
                    <td className="table-cell">{new Date(cr.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="table-cell">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedCR(cr); setReviewNote(''); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canApprove('change_requests') && cr.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600"
                              onClick={() => { setSelectedCR(cr); setReviewNote(''); }}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600"
                              onClick={() => { setSelectedCR(cr); setReviewNote(''); }}>
                              <X className="w-4 h-4" />
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

      <Modal isOpen={!!selectedCR}
        onClose={() => { setSelectedCR(null); setReviewNote(''); }}
        title={`Change Request — ${selectedCR?.entity_type} #${selectedCR?.entity_id}`} size="lg">
        {selectedCR && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="form-label">Action</label>
                <span className={`px-2 py-1 rounded text-xs font-medium ${selectedCR.action === 'DELETE' ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100'}`}>
                  {selectedCR.action}
                </span>
              </div>
              <div>
                <label className="form-label">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[selectedCR.status]}`}>
                  {selectedCR.status}
                </span>
              </div>
              <div><label className="form-label">Requested By</label><p>{selectedCR.requested_by_name}</p></div>
              <div><label className="form-label">Date</label><p>{new Date(selectedCR.created_at).toLocaleDateString('en-IN')}</p></div>
              <div className="col-span-2">
                <label className="form-label">Reason</label>
                <p className="bg-secondary-50 p-2 rounded">{selectedCR.reason}</p>
              </div>
            </div>

            {/* Current state — clean display */}
            <DataDisplay
              data={selectedCR.old_data}
              entityType={selectedCR.entity_type}
              label="Current Data"
            />

            {/* Requested changes — clean display */}
            {selectedCR.action === 'UPDATE' && (
              <DataDisplay
                data={selectedCR.new_data}
                entityType={selectedCR.entity_type}
                label="Requested Changes"
                bg="bg-blue-50"
              />
            )}
            {selectedCR.action === 'DELETE' && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                ⚠️ This request will <strong>cancel/delete</strong> the above record permanently.
              </div>
            )}

            {selectedCR.reviewed_by_name && (
              <div className="bg-secondary-50 p-3 rounded text-sm">
                <p><strong>Reviewed by:</strong> {selectedCR.reviewed_by_name}</p>
                {selectedCR.review_note && <p><strong>Note:</strong> {selectedCR.review_note}</p>}
              </div>
            )}

            {canApprove('change_requests') && selectedCR.status === 'PENDING' && (
              <div className="border-t pt-4 space-y-3">
                <Input
                  label="Review Note (required for rejection)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note..."
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setSelectedCR(null); setReviewNote(''); }}>
                    Cancel
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleReview('reject')}
                    disabled={rejectMutation.isPending}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => handleReview('approve')}
                    disabled={approveMutation.isPending}>
                    <Check className="w-4 h-4 mr-1" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve & Apply'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
