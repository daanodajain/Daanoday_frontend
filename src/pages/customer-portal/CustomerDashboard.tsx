import React, { useEffect, useState, useCallback } from 'react';
import {
  Home, Receipt, CreditCard, ShoppingBag, User,
  Download, Clock, CheckCircle, XCircle, ChevronRight,
  LogOut, Phone, Lock, Eye, EyeOff, Building2,
  AlertCircle, RefreshCw, X, TrendingDown, Wallet,
  IndianRupee, FileText, ChevronDown,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'home' | 'receipts' | 'payments' | 'expenses' | 'profile';

interface StoreAccess { store_id: string; account_number: string; is_primary_store: number; store_name: string; }
interface Receipt { id: string; receipt_number: string; total_amount: number; paid_amount: number; payment_mode: string; receipt_state: string; status: string; created_at: string; store_name: string; store_id: string; account_number: string; is_due?: boolean; remarks?: string; }
interface Txn { id: string; type: string; amount: number; payment_mode: string; status: string; created_at: string; store_name: string; receipt_number?: string; }
interface Expense { id: string; challan_number: string; total_amount: number; payment_mode: string; status: string; created_at: string; store_name: string; supplier_name: string; }
interface Stats { totalDonated: number; totalReceipts: number; totalDue: number; storesEnrolled: number; pendingPayments: number; }
interface PayModal { open: boolean; receipt: Receipt | null; step: 'choose' | 'cash-pending'; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PAID:             { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
    PARTIAL:          { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Partial' },
    UNPAID:           { bg: 'bg-red-100',     text: 'text-red-600',     label: 'Due' },
    APPROVED:         { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Approved' },
    PENDING_APPROVAL: { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Pending' },
    DRAFT:            { bg: 'bg-gray-100',    text: 'text-gray-500',    label: 'Draft' },
    REJECTED:         { bg: 'bg-red-100',     text: 'text-red-600',     label: 'Rejected' },
    CANCELLED:        { bg: 'bg-gray-100',    text: 'text-gray-400',    label: 'Cancelled' },
  };
  const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text} ${className}`}>{s.label}</span>;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const CustomerDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('home');
  const [stats, setStats] = useState<Stats | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stores, setStores] = useState<StoreAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payModal, setPayModal] = useState<PayModal>({ open: false, receipt: null, step: 'choose' });
  const [onlinePaying, setOnlinePaying] = useState(false);
  const [cashRequesting, setCashRequesting] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeDropdown, setStoreDropdown] = useState(false);
  const { user, logout, updateUser } = useAuthStore();

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState<'idle' | 'otp'>('idle');
  const [newMobile, setNewMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileSending, setMobileSending] = useState(false);
  const [emailStep, setEmailStep] = useState<'idle' | 'otp'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [statsRes, receiptsRes, profileRes] = await Promise.all([
        apiService.getCustomerStats(),
        apiService.getCustomerReceipts(),
        apiService.get('/customer-profile'),
      ]);
      setStats(statsRes?.DDMS_data || null);
      setReceipts(receiptsRes?.DDMS_data || []);
      const prof = profileRes?.DDMS_data;
      if (prof?.storeAccess) {
        setStores(prof.storeAccess);
        if (!selectedStoreId && prof.storeAccess.length > 0) {
          const primary = prof.storeAccess.find((s: StoreAccess) => s.is_primary_store) || prof.storeAccess[0];
          setSelectedStoreId(primary.store_id);
        }
      }
      setProfileName(prof?.name || (user as any)?.name || '');
    } catch (e: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (tab === 'payments' && txns.length === 0)
      apiService.getCustomerTransactions().then(r => setTxns(r?.DDMS_data || [])).catch(() => {});
    if (tab === 'expenses' && expenses.length === 0)
      apiService.getCustomerStoreExpenses().then(r => setExpenses(r?.DDMS_data || [])).catch(() => {});
  }, [tab]);

  // ── Filtered receipts by selected store ──────────────────────────────────
  const currentStore = stores.find(s => s.store_id === selectedStoreId);
  const filteredReceipts = selectedStoreId
    ? receipts.filter(r => String(r.store_id) === String(selectedStoreId))
    : receipts;

  // ── PDF Download ─────────────────────────────────────────────────────────
  const downloadPdf = async (r: Receipt) => {
    try {
      const blob = await apiService.getCustomerReceiptPdf(r.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${r.receipt_number}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Could not download receipt'); }
  };

  // ── Pay Flow ──────────────────────────────────────────────────────────────
  const openPay = (r: Receipt) => {
    if (r.receipt_state === 'PENDING_APPROVAL') {
      setPayModal({ open: true, receipt: r, step: 'cash-pending' });
    } else {
      setPayModal({ open: true, receipt: r, step: 'choose' });
    }
  };

  const handleCashRequest = async () => {
    if (!payModal.receipt) return;
    setCashRequesting(true);
    const r = payModal.receipt;
    const due = Number(r.total_amount) - Number(r.paid_amount || 0);
    try {
      await apiService.customerRequestCashPayment(r.id, due, r.store_id);
      toast.success('Cash request sent to store admin!');
      setPayModal({ open: false, receipt: null, step: 'choose' });
      loadAll(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Failed to send request');
    } finally { setCashRequesting(false); }
  };

  const handleCancelCash = async (receiptId: string) => {
    try {
      await apiService.customerCancelCashRequest(receiptId);
      toast.success('Cash request cancelled');
      setPayModal({ open: false, receipt: null, step: 'choose' });
      loadAll(true);
    } catch { toast.error('Failed to cancel'); }
  };

  const handleOnlinePay = async () => {
    if (!payModal.receipt) return;
    setOnlinePaying(true);
    const r = payModal.receipt;
    try {
      const res = await apiService.initiateCustomerOnlinePayment(r.id, r.store_id);
      const { orderId, keyId, amount } = res?.DDMS_data || {};
      if (!orderId) { toast.error('Payment gateway not configured for this store'); setOnlinePaying(false); return; }

      const rzp = new (window as any).Razorpay({
        key: keyId, amount, currency: 'INR',
        name: 'Daanoday', description: `Receipt ${r.receipt_number}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            await apiService.verifyCustomerOnlinePayment(
              response.razorpay_payment_id, response.razorpay_order_id,
              response.razorpay_signature, r.id, r.store_id
            );
            toast.success('Payment successful! Receipt updated.');
            setPayModal({ open: false, receipt: null, step: 'choose' });
            loadAll(true);
          } catch { toast.error('Payment verification failed. Contact store staff.'); }
        },
        modal: { ondismiss: () => setOnlinePaying(false) },
        prefill: { name: user?.name, contact: (user as any)?.mobile },
        theme: { color: '#7c3aed' },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.response?.data?.DDMS_error_code || 'Failed to initiate payment');
      setOnlinePaying(false);
    }
  };

  // ── Profile Actions ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!profileName.trim()) { toast.error('Name cannot be empty'); return; }
    setProfileSaving(true);
    try {
      await apiService.updateCustomerProfile({ name: profileName.trim() });
      updateUser({ name: profileName.trim() });
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); } finally { setProfileSaving(false); }
  };

  const sendMobileOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(newMobile)) { toast.error('Enter valid 10-digit mobile'); return; }
    setMobileSending(true);
    try {
      await apiService.customerSendMobileOtp(newMobile);
      setMobileStep('otp'); toast.success('OTP sent to new number');
    } catch (e: any) { toast.error(e?.response?.data?.DDMS_error_code || 'Failed'); } finally { setMobileSending(false); }
  };

  const verifyMobileOtp = async () => {
    try {
      await apiService.customerVerifyMobileOtp(newMobile, mobileOtp);
      updateUser({ mobile: newMobile } as any);
      setMobileStep('idle'); setNewMobile(''); setMobileOtp('');
      toast.success('Mobile number updated!');
    } catch (e: any) { toast.error(e?.response?.data?.DDMS_error_code || 'Invalid OTP'); }
  };

  const sendEmailOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error('Enter valid email'); return; }
    setEmailSending(true);
    try {
      await apiService.post('/customer-profile/send-email-otp', { email: newEmail });
      setEmailStep('otp'); toast.success('OTP sent to email');
    } catch (e: any) { toast.error(e?.response?.data?.DDMS_error_code || 'Failed'); } finally { setEmailSending(false); }
  };

  const verifyEmailOtp = async () => {
    try {
      await apiService.post('/customer-profile/verify-email-otp', { email: newEmail, otp: emailOtp });
      updateUser({ email: newEmail } as any);
      setEmailStep('idle'); setNewEmail(''); setEmailOtp('');
      toast.success('Email updated!');
    } catch (e: any) { toast.error(e?.response?.data?.DDMS_error_code || 'Invalid OTP'); }
  };

  const changePw = async () => {
    if (pw.next.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (pw.next !== pw.confirm) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await apiService.customerChangePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Password changed!');
    } catch (e: any) { toast.error(e?.response?.data?.DDMS_error_code || 'Failed'); } finally { setPwSaving(false); }
  };

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Loading your dashboard…</p>
      </div>
    </div>
  );

  const due = stats ? Number(stats.totalDue) : 0;
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 text-white px-4 pt-10 pb-6 relative">
        {/* Refresh button */}
        <button onClick={() => loadAll(true)} disabled={refreshing}
          className="absolute top-4 right-12 p-1.5 rounded-full bg-white/10 hover:bg-white/20">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        {/* Logout */}
        <button onClick={() => logout()} className="absolute top-4 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20">
          <LogOut className="w-4 h-4" />
        </button>

        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-base leading-tight">{user?.name}</p>
            <p className="text-xs text-primary-100 mt-0.5">{(user as any)?.mobile}</p>
          </div>
        </div>

        {/* Store Switcher */}
        {stores.length > 0 && (
          <div className="relative mb-4">
            <button onClick={() => setStoreDropdown(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/15 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 shrink-0 opacity-80" />
                <span>{currentStore?.store_name || 'All Stores'}</span>
                {currentStore && <span className="text-primary-200 text-xs">· {currentStore.account_number}</span>}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${storeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {storeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100">
                {stores.map(s => (
                  <button key={s.store_id} onClick={() => { setSelectedStoreId(s.store_id); setStoreDropdown(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${selectedStoreId === s.store_id ? 'bg-primary-50' : ''}`}>
                    <div className="text-left">
                      <p className={`font-medium ${selectedStoreId === s.store_id ? 'text-primary-700' : 'text-gray-800'}`}>{s.store_name}</p>
                      <p className="text-xs text-gray-400">A/C: {s.account_number}</p>
                    </div>
                    {s.is_primary_store ? <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Primary</span> : null}
                    {selectedStoreId === s.store_id ? <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" /> : null}
                  </button>
                ))}
                <button onClick={() => { setSelectedStoreId(null); setStoreDropdown(false); }}
                  className="w-full px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 border-t text-left">
                  Show All Stores
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Donated', value: fmt(stats?.totalDonated || 0), color: 'text-white' },
            { label: 'Due', value: fmt(due), color: due > 0 ? 'text-red-200' : 'text-white' },
            { label: 'Receipts', value: String(stats?.totalReceipts || 0), color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-primary-100 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">

        {/* ── HOME ───────────────────────────────────────────────────── */}
        {tab === 'home' && (
          <>
            {/* Due alert */}
            {due > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700">You have {fmt(due)} due</p>
                  <p className="text-xs text-red-500">{stats?.pendingPayments} receipt{(stats?.pendingPayments || 0) > 1 ? 's' : ''} pending payment</p>
                </div>
                <button onClick={() => setTab('receipts')} className="text-xs font-medium text-red-600 bg-red-100 px-3 py-1.5 rounded-full">Pay Now</button>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Receipt className="w-5 h-5" />, label: 'My Receipts', sub: `${receipts.length} total`, tab: 'receipts' as Tab, color: 'bg-blue-50 text-blue-600' },
                { icon: <Wallet className="w-5 h-5" />, label: 'Payments', sub: `${txns.length || '—'} transactions`, tab: 'payments' as Tab, color: 'bg-emerald-50 text-emerald-600' },
                { icon: <TrendingDown className="w-5 h-5" />, label: 'Store Expenses', sub: 'Supplier bills', tab: 'expenses' as Tab, color: 'bg-amber-50 text-amber-600' },
                { icon: <User className="w-5 h-5" />, label: 'Profile', sub: 'Edit details', tab: 'profile' as Tab, color: 'bg-violet-50 text-violet-600' },
              ].map(q => (
                <button key={q.tab} onClick={() => setTab(q.tab)}
                  className="bg-white rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>{q.icon}</div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{q.label}</p>
                    <p className="text-xs text-gray-400">{q.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Recent Receipts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h2 className="font-semibold text-sm text-gray-800">Recent Receipts</h2>
                <button onClick={() => setTab('receipts')} className="text-xs text-primary-600 font-medium flex items-center gap-0.5">
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {filteredReceipts.length === 0
                ? <div className="py-10 text-center text-gray-400 text-sm"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />No receipts yet</div>
                : filteredReceipts.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-sm text-gray-800 truncate">{r.receipt_number}</p>
                      <p className="text-xs text-gray-400">{r.store_name} · {fmtDate(r.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="font-bold text-sm">{fmt(r.total_amount)}</p>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ── RECEIPTS ───────────────────────────────────────────────── */}
        {tab === 'receipts' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Receipts <span className="text-gray-400 font-normal text-sm">({filteredReceipts.length})</span></h2>
              {stores.length > 1 && (
                <span className="text-xs text-gray-400">{currentStore?.store_name || 'All Stores'}</span>
              )}
            </div>
            {filteredReceipts.length === 0
              ? <div className="py-12 text-center text-gray-400 text-sm"><Receipt className="w-9 h-9 mx-auto mb-2 opacity-25" />No receipts found</div>
              : filteredReceipts.map(r => {
                const due = Number(r.total_amount) - Number(r.paid_amount || 0);
                const canPay = ['APPROVED', 'PENDING_APPROVAL'].includes(r.receipt_state) && r.status !== 'PAID';
                const isPaidFully = r.status === 'PAID';
                const isPendingApproval = r.receipt_state === 'PENDING_APPROVAL';
                return (
                  <div key={r.id} className="px-4 py-4 border-b border-gray-50 last:border-0">
                    <div className="flex items-start gap-3">
                      {/* Left icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isPaidFully ? 'bg-emerald-100' : isPendingApproval ? 'bg-orange-100' : due > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                        {isPaidFully
                          ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                          : isPendingApproval
                          ? <Clock className="w-5 h-5 text-orange-600" />
                          : due > 0
                          ? <IndianRupee className="w-5 h-5 text-red-500" />
                          : <Receipt className="w-5 h-5 text-gray-400" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm text-gray-800 truncate">{r.receipt_number}</p>
                          <p className="font-bold text-sm shrink-0">{fmt(r.total_amount)}</p>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{r.store_name} · {fmtDate(r.created_at)}</p>
                        <p className="text-xs text-gray-400 mb-2">A/C: {r.account_number}</p>

                        {/* Status badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <StatusBadge status={r.status} />
                          {r.payment_mode && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">{r.payment_mode}</span>}
                          {isPendingApproval && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 font-medium"><Clock className="w-3 h-3" />Awaiting approval</span>}
                        </div>

                        {/* Due amount */}
                        {due > 0 && <p className="text-xs font-medium text-red-500 mb-3">Balance due: {fmt(due)}</p>}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {/* Download — only for PAID receipts */}
                          {isPaidFully && (
                            <button onClick={() => downloadPdf(r)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">
                              <Download className="w-3.5 h-3.5" /> Download PDF
                            </button>
                          )}

                          {/* Pay — for UNPAID or PARTIAL with APPROVED state */}
                          {canPay && !isPendingApproval && (
                            <button onClick={() => openPay(r)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors">
                              <IndianRupee className="w-3.5 h-3.5" /> Pay {fmt(due)}
                            </button>
                          )}

                          {/* Cash pending — show status + cancel option */}
                          {isPendingApproval && (
                            <button onClick={() => openPay(r)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-medium transition-colors">
                              <Clock className="w-3.5 h-3.5" /> Cash Pending · Tap to cancel
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
        )}

        {/* ── PAYMENTS ───────────────────────────────────────────────── */}
        {tab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800">Payment History <span className="text-gray-400 font-normal text-sm">({txns.length})</span></h2>
            </div>
            {txns.length === 0
              ? <div className="py-12 text-center text-gray-400 text-sm"><CreditCard className="w-9 h-9 mx-auto mb-2 opacity-25" />No transactions found</div>
              : txns.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {t.status === 'SUCCESS' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{t.receipt_number || t.type}</p>
                    <p className="text-xs text-gray-400">{t.store_name} · {fmtDate(t.created_at)}</p>
                    {t.payment_mode && <span className="text-xs text-gray-400">{t.payment_mode}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-emerald-600">{fmt(t.amount)}</p>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── EXPENSES ───────────────────────────────────────────────── */}
        {tab === 'expenses' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800">Store Expenses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Paid supplier bills for your enrolled stores</p>
            </div>
            {expenses.length === 0
              ? <div className="py-12 text-center text-gray-400 text-sm"><ShoppingBag className="w-9 h-9 mx-auto mb-2 opacity-25" />No expenses yet</div>
              : expenses.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{e.challan_number}</p>
                    <p className="text-xs text-gray-400">{e.store_name} · {e.supplier_name}</p>
                    <p className="text-xs text-gray-400">{fmtDate(e.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{fmt(e.total_amount)}</p>
                    <span className="text-xs text-gray-400">{e.payment_mode}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── PROFILE ────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="space-y-4">
            {/* Avatar card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-base">{user?.name}</p>
                <p className="text-sm text-gray-500">{(user as any)?.mobile}</p>
                {(user as any)?.email && <p className="text-xs text-gray-400">{(user as any).email}</p>}
                <p className="text-xs text-primary-600 font-medium mt-1">Customer · {stores.length} store{stores.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Enrolled Stores */}
            {stores.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <p className="px-4 py-3 text-sm font-semibold text-gray-800 border-b border-gray-50">Enrolled Stores</p>
                {stores.map(s => (
                  <div key={s.store_id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{s.store_name}</p>
                      <p className="text-xs text-gray-400">A/C: {s.account_number}</p>
                    </div>
                    {s.is_primary_store ? <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Primary</span> : null}
                  </div>
                ))}
              </div>
            )}

            {/* Update Name */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Update Name</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Full name"
              />
              <button onClick={saveProfile} disabled={profileSaving}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                {profileSaving ? 'Saving…' : 'Save Name'}
              </button>
            </div>

            {/* Change Mobile */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> Change Mobile Number</p>
              {mobileStep === 'idle' ? (
                <>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="tel" maxLength={10} value={newMobile} onChange={e => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="New 10-digit mobile" />
                  <button onClick={sendMobileOtp} disabled={mobileSending}
                    className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                    {mobileSending ? 'Sending…' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400">OTP sent to {newMobile}</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="text" maxLength={6} value={mobileOtp} onChange={e => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" />
                  <div className="flex gap-2">
                    <button onClick={() => { setMobileStep('idle'); setMobileOtp(''); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Back</button>
                    <button onClick={verifyMobileOtp} className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold">Verify & Save</button>
                  </div>
                </>
              )}
            </div>

            {/* Change Email */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">@ Change Email</p>
              {emailStep === 'idle' ? (
                <>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" />
                  <button onClick={sendEmailOtp} disabled={emailSending}
                    className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                    {emailSending ? 'Sending…' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400">OTP sent to {newEmail}</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="text" maxLength={6} value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" />
                  <div className="flex gap-2">
                    <button onClick={() => { setEmailStep('idle'); setEmailOtp(''); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Back</button>
                    <button onClick={verifyEmailOtp} className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold">Verify & Save</button>
                  </div>
                </>
              )}
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-400" /> Change Password</p>
              {(['current', 'next', 'confirm'] as const).map((field, i) => (
                <div key={field} className="relative">
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type={showPw[field] ? 'text' : 'password'}
                    value={pw[field]}
                    onChange={e => setPw(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={['Current password', 'New password (min 6)', 'Confirm new password'][i]}
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ))}
              <button onClick={changePw} disabled={pwSaving}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
            </div>

            {/* Logout */}
            <button onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors bg-white">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Nav ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20 safe-area-pb">
        {([
          { key: 'home',     label: 'Home',     Icon: Home },
          { key: 'receipts', label: 'Receipts', Icon: Receipt },
          { key: 'payments', label: 'Payments', Icon: CreditCard },
          { key: 'expenses', label: 'Expenses', Icon: ShoppingBag },
          { key: 'profile',  label: 'Profile',  Icon: User },
        ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 pt-3 pb-4 flex flex-col items-center gap-1 text-xs font-medium transition-colors ${tab === key ? 'text-primary-600' : 'text-gray-400'}`}>
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Payment Modal ───────────────────────────────────────────────── */}
      {payModal.open && payModal.receipt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayModal({ open: false, receipt: null, step: 'choose' })} />
          <div className="relative bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl">
            {/* Close */}
            <button onClick={() => setPayModal({ open: false, receipt: null, step: 'choose' })}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Receipt</p>
              <p className="font-bold text-gray-800 text-base">{payModal.receipt.receipt_number}</p>
            </div>

            {/* Amount */}
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Amount Due</p>
              <p className="text-4xl font-bold text-primary-600">
                {fmt(Number(payModal.receipt.total_amount) - Number(payModal.receipt.paid_amount || 0))}
              </p>
              {payModal.receipt.status === 'PARTIAL' && (
                <p className="text-xs text-gray-400 mt-1">of {fmt(payModal.receipt.total_amount)} total · {fmt(payModal.receipt.paid_amount)} already paid</p>
              )}
            </div>

            {/* PENDING STATE */}
            {payModal.step === 'cash-pending' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-2xl">
                  <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Cash Payment Pending</p>
                    <p className="text-xs text-orange-600 mt-0.5">Your cash payment request has been sent to the store admin. They'll confirm receipt and mark it paid.</p>
                  </div>
                </div>
                <button onClick={() => handleCancelCash(payModal.receipt!.id)}
                  className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> Cancel Cash Request
                </button>
              </div>
            )}

            {/* CHOOSE STATE */}
            {payModal.step === 'choose' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium text-center uppercase tracking-wide">Choose Payment Method</p>

                {/* Cash */}
                <button onClick={handleCashRequest} disabled={cashRequesting}
                  className="w-full p-4 border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-2xl flex items-center gap-4 text-left transition-colors disabled:opacity-60">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl shrink-0">₹</div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">Cash</p>
                    <p className="text-xs text-gray-400 mt-0.5">Request sent to store admin · needs approval</p>
                  </div>
                </button>

                {/* Online */}
                <button onClick={handleOnlinePay} disabled={onlinePaying}
                  className="w-full p-4 border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-2xl flex items-center gap-4 text-left transition-colors disabled:opacity-60">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">Pay Online</p>
                    <p className="text-xs text-gray-400 mt-0.5">UPI · Card · Net Banking · Instant confirmation</p>
                  </div>
                </button>

                {onlinePaying && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    Opening payment gateway…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
