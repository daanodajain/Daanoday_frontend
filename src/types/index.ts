// ── API Response ─────────────────────────────────────────────
export interface DDMSResponse<T = any> {
  status: 'SUCCESS' | 'ERROR';
  DDMS_data?: T;
  DDMS_error_code?: string;
}

// ── Auth ──────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  roles: UserRole[];
  stores: Store[];
}

export interface UserRole {
  name: 'SUPER_ADMIN' | 'STORE_ADMIN' | 'SUB_ADMIN' | 'RECEIPT_MANAGER' | 'CASHIER';
  store_id: string | null;
  store_name: string | null;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  action: string;
}

// ── Store ─────────────────────────────────────────────────────
export interface Store {
  id: string;
  name: string;
  store_admin_id: string | null;
  subscription_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  online_payment_enabled: boolean;
  active: boolean;
  admin_name?: string;
  admin_mobile?: string;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_id: string;
  receipt_prefix: string;
  challan_prefix: string;
  auto_approve_cash: boolean;
  cash_approval_limit: number;
  razorpay_key_id: string | null;
  razorpay_key_secret: string | null;
  sms_enabled: boolean;
  email_enabled: boolean;
  locked_before_date: string | null;
  enable_80g: boolean;
  auto_send_receipt_sms: boolean;
  auto_send_receipt_email: boolean;
  // Store-admin configured session behavior. Null = not configured yet =
  // auto-logout/inactivity-lock are OFF for this store (no hardcoded default).
  session_timeout_minutes: number | null;
  inactivity_lock_minutes: number | null;
}

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  mobile: string;
  active: boolean;
  first_login: boolean;
  linked_customer_id: string | null;
  role_name: string;
  created_at: string;
}

// ── Customer ──────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  account_number: string;
  is_primary_store: boolean;
  first_login: boolean;
  created_at: string;
}

// ── Supplier ──────────────────────────────────────────────────
export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  mobile: string | null;
  active: boolean;
  created_at: string;
}

// ── Particular ────────────────────────────────────────────────
export interface Particular {
  id: string;
  store_id: string;
  type: 'RECEIPT' | 'CHALLAN';
  name: string;
  active: boolean;
  created_at: string;
}

// ── Receipt ───────────────────────────────────────────────────
export type ReceiptState = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'CHEQUE' | 'ONLINE';

export interface Receipt {
  id: string;
  store_id: string;
  receipt_number: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  account_number: string;
  total_amount: number;
  payment_mode: PaymentMode;
  receipt_state: ReceiptState;
  status: 'UNPAID' | 'PAID';
  cancel_reason: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  particulars?: ReceiptParticular[];
}

export interface ReceiptParticular {
  id: string;
  receipt_id: string;
  particular_id: string;
  particular_name: string;
  amount: number;
}

// ── Challan ───────────────────────────────────────────────────
export interface Challan {
  id: string;
  store_id: string;
  challan_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_mobile: string | null;
  total_amount: number;
  payment_mode: PaymentMode;
  status: 'UNPAID' | 'PAID' | 'CANCELLED';
  cancel_reason: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  particulars?: ChallanParticular[];
}

export interface ChallanParticular {
  id: string;
  challan_id: string;
  particular_id: string;
  particular_name: string;
  amount: number;
}

// ── Change Request ────────────────────────────────────────────
export interface ChangeRequest {
  id: string;
  store_id: string;
  entity_type: 'RECEIPT' | 'CHALLAN';
  entity_id: string;
  action: 'UPDATE' | 'DELETE';
  requested_by: string;
  requested_by_name: string;
  old_data: any;
  new_data: any | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ── Transaction ───────────────────────────────────────────────
export interface Transaction {
  id: string;
  store_id: string;
  type: 'RECEIPT' | 'CHALLAN';
  reference_id: string;
  amount: number;
  payment_mode: PaymentMode;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED';
  customer_name?: string;
  supplier_name?: string;
  created_at: string;
}

// ── Notification ──────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  store_id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'RECEIPT_APPROVAL' | 'PAYMENT_RECEIVED' | 'CHANGE_REQUEST';
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  read_status: boolean;
  created_at: string;
}

// ── News & Events ─────────────────────────────────────────────
export interface NewsEvent {
  id: string;
  store_id: string;
  type: 'NEWS' | 'EVENT' | 'ANNOUNCEMENT';
  title: string;
  content: string | null;
  publish_date: string | null;
  priority: number;
  active: boolean;
  created_by_user_id: string;
  created_at: string;
}

// ── Audit Log ─────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  store_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any | null;
  created_at: string;
}

// ── Role ──────────────────────────────────────────────────────
export interface Role {
  id: string;
  store_id: string | null;
  name: 'SUPER_ADMIN' | 'STORE_ADMIN' | 'SUB_ADMIN' | 'RECEIPT_MANAGER' | 'CASHIER';
}

// ── Subscription ──────────────────────────────────────────────
export interface Subscription {
  id: string;
  store_id: string;
  store_name?: string;
  plan_type: 'FREE' | 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'TRIAL';
  start_date: string;
  end_date: string;
  monthly_fee: number;
  notes: string | null;
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardStats {
  today: { receipts: number; collection: number };
  month: { receipts: number; collection: number };
  total: { receipts: number; collection: number };
  pendingApprovals: number;
  pendingChangeRequests: number;
  totalCustomers: number;
}

export interface RevenueDataPoint {
  date: string;
  amount: number;
}

export interface PaymentModeData {
  mode: PaymentMode;
  count: number;
  amount: number;
}

// ── Form helpers ──────────────────────────────────────────────
export interface LoginFormData {
  mobile: string;
  password?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
}
