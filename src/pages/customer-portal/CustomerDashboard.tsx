import React, { useEffect, useState } from 'react';
import {
  Receipt, CreditCard, LogOut, User, Download, TrendingUp,
  ShoppingBag, Lock, Phone, Eye, EyeOff, X, Clock
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

type Tab = 'dashboard' | 'receipts' | 'transactions' | 'expenses' | 'profile';

interface PaymentModalState {
  open: boolean;
  receiptId: string;
  receiptNumber: string;
  dueAmount: number;
  storeId: string;
  cashRequested: boolean;
}

const INIT_PAYMENT: PaymentModalState = {
  open: false, receiptId: '', receiptNumber: '', dueAmount: 0, storeId: '', cashRequested: false
};

export const CustomerDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payment, setPayment] = useState<PaymentModalState>(INIT_PAYMENT);
  const [cashPendingIds, setCashPendingIds] = useState<Set<string>>(new Set());
  const { user, logout, updateUser } = useAuthStore();

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState<'idle' | 'otp'>('idle');
  const [newMobile, setNewMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileSending, setMobileSending] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const loadData = () => {
    apiService.getCustomerStats().then(r => setStats(r?.DDMS_data || null)).catch(() => {});
    apiService.getCustomerReceipts().then(r => setReceipts(r?.DDMS_data || [])).catch(() => {});
  };

  useEffect(() => {
    loadData();
    setProfileName((user as any)?.name || '');
  }, []);

  useEffect(() => {
    if (tab === 'transactions' && transactions.length === 0)
      apiService.getCustomerTransactions().then(r => setTransactions(r?.DDMS_data || [])).catch(() => {});
    if (tab === 'expenses' && expenses.length === 0)
      apiService.getCustomerStoreExpenses().then(r => setExpenses(r?.DDMS_data || [])).catch(() => {});
  }, [tab]);

  const downloadReceipt = async (receiptId: string, receiptNumber: string) => {
    try {
      const blob = await apiService.generateReceiptPDF(receiptId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${receiptNumber}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Could not download receipt'); }
  };

  const openPayment = (r: any) => {
    const due = Number(r.total_amount) - Number(r.paid_amount || 0);
    setPayment({ open: true, receiptId: r.id, receiptNumber: r.receipt_number, dueAmount: due, storeId: r.store_id, cashRequested: cashPendingIds.has(r.id) });
  };

  const handleCashRequest = async () => {
    try {
      await apiService.customerRequestCashPayment(payment.receiptId);
      setCashPendingIds(prev => new Set([...prev, payment.receiptId]));
      toast.success('Cash payment request sent to store admin!');
      setPayment(INIT_PAYMENT);
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Failed to send request');
    }
  };

  const handleCancelCash = async (receiptId: string) => {
    try {
      await apiService.customerCancelCashRequest(receiptId);
      setCashPendingIds(prev => { const s = new Set(prev); s.delete(receiptId); return s; });
      toast.success('Cash request cancelled');
      setPayment(INIT_PAYMENT);
    } catch { toast.error('Failed to cancel'); }
  };

  const handleOnlinePayment = async () => {
    try {
      const res = await apiService.initiateCustomerOnlinePayment(payment.receiptId, payment.dueAmount, payment.storeId);
      const { orderId, keyId, amount } = res?.DDMS_data || {};
      if (!orderId) { toast.error('Payment gateway not configured'); return; }

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency: 'INR',
        name: 'Daanoday',
        description: `Receipt ${payment.receiptNumber}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            await apiService.verifyCustomerOnlinePayment(
              response.razorpay_payment_id, response.razorpay_order_id,
              response.razorpay_signature, payment.receiptId, payment.storeId
            );
            toast.success('Payment successful!');
            setPayment(INIT_PAYMENT);
            loadData();
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { name: user?.name, contact: (user as any)?.mobile },
        theme: { color: '#7c3aed' },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Payment failed');
    }
  };

  const saveProfile = async () => {
    if (!profileName.trim()) { toast.error('Name required'); return; }
    setProfileSaving(true);
    try {
      const res = await apiService.updateCustomerProfile({ name: profileName.trim() });
      if (res?.status === 'SUCCESS') {
        updateUser({ name: profileName.trim() });
        toast.success('Profile updated');
      }
    } catch { toast.error('Failed to update profile'); }
    finally { setProfileSaving(false); }
  };

  const sendMobileOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(newMobile)) { toast.error('Enter valid 10-digit mobile'); return; }
    setMobileSending(true);
    try {
      await apiService.customerSendMobileOtp(newMobile);
      setMobileStep('otp');
      toast.success('OTP sent');
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Failed to send OTP');
    } finally { setMobileSending(false); }
  };

  const verifyMobileOtp = async () => {
    try {
      await apiService.customerVerifyMobileOtp(newMobile, mobileOtp);
      updateUser({ mobile: newMobile } as any);
      setMobileStep('idle'); setNewMobile(''); setMobileOtp('');
      toast.success('Mobile number updated!');
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Invalid OTP');
    }
  };

  const changePassword = async () => {
    if (pwForm.next.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await apiService.customerChangePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed successfully');
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700',
      PARTIAL: 'bg-yellow-100 text-yellow-700',
      UNPAID: 'bg-red-100 text-red-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
      DRAFT: 'bg-gray-100 text-gray-600',
      REJECTED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return `text-xs px-2 py-0.5 rounded font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`;
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Home', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'receipts', label: 'Receipts', icon: <Receipt className="w-4 h-4" /> },
    { key: 'transactions', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'expenses', label: 'Expenses', icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{user?.name}</p>
            <p className="text-xs text-primary-200">{(user as any)?.mobile}</p>
          </div>
        </div>
        <button onClick={() => logout()} className="text-primary-200 hover:text-white p-1">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-primary-600">₹{Number(stats?.totalDonated || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total Donated</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats?.totalReceipts || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Total Receipts</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-red-500">₹{Number(stats?.totalDue || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total Due</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{stats?.pendingPayments || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </Card>
            </div>

            <Card>
              <div className="p-4">
                <h2 className="font-semibold mb-3 text-sm text-gray-700">Recent Receipts</h2>
                {receipts.length === 0
                  ? <p className="text-center text-gray-400 py-6 text-sm">No receipts yet</p>
                  : receipts.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{r.receipt_number}</p>
                        <p className="text-xs text-gray-500">{r.store_name} · {new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-sm">₹{Number(r.total_amount).toLocaleString()}</p>
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>
          </>
        )}

        {/* ── RECEIPTS TAB ── */}
        {tab === 'receipts' && (
          <Card>
            <div className="p-4">
              <h2 className="font-semibold mb-3">All Receipts ({receipts.length})</h2>
              {receipts.length === 0
                ? <p className="text-center text-gray-400 py-6 text-sm">No receipts found</p>
                : receipts.map(r => {
                  const due = Number(r.total_amount) - Number(r.paid_amount || 0);
                  const canPay = r.receipt_state === 'APPROVED' && r.status !== 'PAID';
                  const cashPending = cashPendingIds.has(r.id);
                  return (
                    <div key={r.id} className="py-3 border-b last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{r.receipt_number}</p>
                          <p className="text-xs text-gray-500">{r.store_name}</p>
                          <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')} · A/C: {r.account_number}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <span className={statusBadge(r.receipt_state)}>{r.receipt_state}</span>
                            <span className={statusBadge(r.status)}>{r.status}</span>
                            {r.payment_mode && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{r.payment_mode}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="font-bold text-sm">₹{Number(r.total_amount).toLocaleString()}</p>
                          {r.status !== 'PAID' && <p className="text-xs text-red-500">Due: ₹{due.toLocaleString()}</p>}
                          <div className="flex gap-1 justify-end">
                            {r.receipt_state === 'APPROVED' && (
                              <button onClick={() => downloadReceipt(r.id, r.receipt_number)}
                                className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600" title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canPay && !cashPending && (
                              <button onClick={() => openPayment(r)}
                                className="px-2 py-1 rounded bg-primary-600 text-white text-xs hover:bg-primary-700">
                                Pay
                              </button>
                            )}
                            {cashPending && (
                              <button onClick={() => setPayment({ open: true, receiptId: r.id, receiptNumber: r.receipt_number, dueAmount: due, storeId: r.store_id, cashRequested: true })}
                                className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </Card>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <Card>
            <div className="p-4">
              <h2 className="font-semibold mb-3">Payment History ({transactions.length})</h2>
              {transactions.length === 0
                ? <p className="text-center text-gray-400 py-6 text-sm">No transactions found</p>
                : transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{t.receipt_number || t.type}</p>
                      <p className="text-xs text-gray-500">{t.store_name} · {new Date(t.created_at).toLocaleDateString('en-IN')}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{t.payment_mode}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">₹{Number(t.amount).toLocaleString()}</p>
                      <span className={statusBadge(t.status)}>{t.status}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </Card>
        )}

        {/* ── STORE EXPENSES TAB ── */}
        {tab === 'expenses' && (
          <Card>
            <div className="p-4">
              <h2 className="font-semibold mb-1">Store Expenses</h2>
              <p className="text-xs text-gray-400 mb-3">Approved & paid supplier expenses for your enrolled stores</p>
              {expenses.length === 0
                ? <p className="text-center text-gray-400 py-6 text-sm">No expenses found</p>
                : expenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{e.challan_number}</p>
                      <p className="text-xs text-gray-500">{e.store_name} · {e.supplier_name}</p>
                      <p className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{Number(e.total_amount).toLocaleString()}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{e.payment_mode}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </Card>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="space-y-4">
            {/* Avatar */}
            <Card className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-gray-500">{(user as any)?.mobile}</p>
                <p className="text-xs text-gray-400">Customer</p>
              </div>
            </Card>

            {/* Update Name */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Update Name</h3>
              <Input
                label="Full Name"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Your full name"
              />
              <Button onClick={saveProfile} loading={profileSaving} className="w-full">Save Name</Button>
            </Card>

            {/* Change Mobile with OTP */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Change Mobile Number</h3>
              {mobileStep === 'idle' ? (
                <>
                  <Input
                    label="New Mobile Number"
                    type="tel"
                    maxLength={10}
                    value={newMobile}
                    onChange={e => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter new 10-digit mobile"
                  />
                  <Button onClick={sendMobileOtp} loading={mobileSending} className="w-full">Send OTP</Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500">OTP sent to {newMobile}</p>
                  <Input
                    label="Enter OTP"
                    type="text"
                    maxLength={6}
                    value={mobileOtp}
                    onChange={e => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setMobileStep('idle'); setMobileOtp(''); }} className="flex-1">Back</Button>
                    <Button onClick={verifyMobileOtp} className="flex-1">Verify & Update</Button>
                  </div>
                </>
              )}
            </Card>

            {/* Change Password */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showPw.current ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Current password"
                />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-8 text-gray-400">
                  {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPw.next ? 'text' : 'password'}
                  value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="New password (min 6 chars)"
                />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, next: !p.next }))}
                  className="absolute right-3 top-8 text-gray-400">
                  {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3 top-8 text-gray-400">
                  {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={changePassword} loading={pwSaving} className="w-full">Change Password</Button>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-10">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Payment Modal */}
      <Modal isOpen={payment.open} onClose={() => setPayment(INIT_PAYMENT)} title={`Pay for ${payment.receiptNumber}`}>
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">Amount Due</p>
            <p className="text-3xl font-bold text-primary-600">₹{payment.dueAmount.toLocaleString()}</p>
          </div>

          {payment.cashRequested ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg text-orange-700 text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Cash payment request sent to store admin. Waiting for approval.</span>
              </div>
              <Button variant="outline" onClick={() => handleCancelCash(payment.receiptId)} className="w-full text-red-600 border-red-300 hover:bg-red-50">
                <X className="w-4 h-4 mr-2" /> Cancel Cash Request
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">Choose payment method:</p>
              <button onClick={handleCashRequest}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors text-left flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg shrink-0">₹</div>
                <div>
                  <p className="font-semibold text-sm">Cash</p>
                  <p className="text-xs text-gray-500">Request will be sent to store admin for approval</p>
                </div>
              </button>
              <button onClick={handleOnlinePayment}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors text-left flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Online Payment</p>
                  <p className="text-xs text-gray-500">Pay instantly via UPI, Card, Net Banking</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
