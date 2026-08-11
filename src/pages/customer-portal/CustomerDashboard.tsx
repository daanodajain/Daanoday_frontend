import React, { useEffect, useState } from 'react';
import { Receipt, CreditCard, Store, LogOut, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

type Tab = 'dashboard' | 'receipts';

export const CustomerDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    apiService.getCustomerStats()
      .then(r => setStats(r?.DDMS_data || null))
      .catch(() => {});
    apiService.getCustomerReceipts()
      .then(r => setReceipts(r?.DDMS_data || []))
      .catch(() => {});
  }, []);

  const totalDonated   = stats?.totalDonated   ?? 0;
  const totalReceipts  = stats?.totalReceipts  ?? 0;
  const storesEnrolled = stats?.storesEnrolled ?? 0;

  const pendingReceipts  = receipts.filter(r => r.status === 'UNPAID').length;
  const approvedReceipts = receipts.filter(r => r.receipt_state === 'APPROVED');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{user?.name}</p>
            <p className="text-xs text-primary-200">{(user as any)?.mobile}</p>
          </div>
        </div>
        <button onClick={() => logout()} className="text-primary-200 hover:text-white">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {(['dashboard', 'receipts'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${
              tab === t ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
            }`}>
            {t === 'dashboard' ? 'Dashboard' : 'My Receipts'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {tab === 'dashboard' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-primary-600">₹{Number(totalDonated).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total Donated</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{totalReceipts}</p>
                <p className="text-xs text-gray-500 mt-1">Receipts</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{pendingReceipts}</p>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </Card>
            </div>

            {/* Recent receipts */}
            <Card>
              <div className="p-4">
                <h2 className="font-semibold mb-3">Recent Donations</h2>
                {approvedReceipts.length === 0
                  ? <p className="text-center text-gray-400 py-6 text-sm">No donations yet</p>
                  : approvedReceipts.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{r.receipt_number}</p>
                        <p className="text-xs text-gray-500">{r.store_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{Number(r.total_amount).toLocaleString()}</p>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{r.payment_mode}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>
          </>
        )}

        {tab === 'receipts' && (
          <Card>
            <div className="p-4">
              <h2 className="font-semibold mb-3">All Receipts ({receipts.length})</h2>
              {receipts.length === 0
                ? <p className="text-center text-gray-400 py-6 text-sm">No receipts found</p>
                : receipts.map(r => (
                  <div key={r.id} className="py-3 border-b last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.receipt_number}</p>
                        <p className="text-xs text-gray-500">{r.store_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">A/C: {r.account_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{Number(r.total_amount).toLocaleString()}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          r.receipt_state === 'APPROVED' ? 'bg-green-100 text-green-700'
                          : r.receipt_state === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{r.receipt_state}</span>
                        <br />
                        <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                          r.status === 'PAID' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
