import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { DDMSResponse } from '@/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ddback.daanoday.com/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use((config) => {
      const { token, currentStore } = useAuthStore.getState();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      if (currentStore) config.headers['X-Store-ID'] = currentStore.id;
      return config;
    });

    this.api.interceptors.response.use(
      (response: AxiosResponse<DDMSResponse>) => {
        if (response.data?.status === 'ERROR')
          return Promise.reject(new Error(response.data.DDMS_error_code || 'An error occurred'));
        return response;
      },
      async (error) => {
        if (error.config?.url?.includes('/auth/refresh') || error.config?._retry) {
          useAuthStore.getState().logout();
          return Promise.reject(new Error('Session expired. Please login again.'));
        }
        if (error.response?.status === 401) {
          const { refreshToken, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) return Promise.reject(error);
          if (!refreshToken) { useAuthStore.getState().logout(); return Promise.reject(error); }
          error.config._retry = true;
          try {
            const res = await axios.post<DDMSResponse>(
              `${BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.data?.status === 'SUCCESS' && res.data.DDMS_data) {
              const { token: newToken, refreshToken: newRT } = res.data.DDMS_data;
              const { user } = useAuthStore.getState();
              if (user && newToken) {
                useAuthStore.getState().setAuth(user, newToken, newRT || refreshToken);
                return this.api.request(error.config);
              }
            }
            throw new Error('Refresh failed');
          } catch { useAuthStore.getState().logout(); return Promise.reject(error); }
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Generic HTTP helpers ────────────────────────────────────────────────
  async get<T = any>(url: string, config?: any) {
    const r = await this.api.get<T>(url, config); return r.data;
  }
  async post<T = any>(url: string, data?: any, config?: any) {
    const r = await this.api.post<T>(url, data, config); return r.data;
  }
  async put<T = any>(url: string, data?: any, config?: any) {
    const r = await this.api.put<T>(url, data, config); return r.data;
  }
  async patch<T = any>(url: string, data?: any, config?: any) {
    const r = await this.api.patch<T>(url, data, config); return r.data;
  }
  async delete<T = any>(url: string, config?: any) {
    const r = await this.api.delete<T>(url, config); return r.data;
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  async login(identifier: string, password: string) {
    const r = await this.api.post<DDMSResponse>('/auth/login', { identifier, password });
    return r.data;
  }
  async changePasswordFirstLogin(newPassword: string) {
    return this.post('/auth/change-password', { newPassword });
  }
  async logout() { return this.post('/auth/logout'); }
  async unlockSession(password: string) { return this.post('/auth/unlock', { password }); }

  // ─── User Management ─────────────────────────────────────────────────────
  async getUsers() { return this.get('/users'); }
  async createUser(data: any) { return this.post('/users', data); }
  async updateUser(id: string, data: any) { return this.put(`/users/${id}`, data); }
  async deleteUser(id: string) { return this.delete(`/users/${id}`); }
  async toggleUserStatus(id: string) { return this.patch(`/users/${id}/toggle-status`); }
  async assignRoleInStore(userId: string, roleId: string) {
    return this.post(`/users/${userId}/assign-role`, { roleId });
  }

  // ─── User Profile (logged-in staff) ──────────────────────────────────────
  async updateUserProfile(data: any) { return this.put('/user-profile', data); }

  // ─── Role & Permission Management ────────────────────────────────────────
  async getRoles() { return this.get('/roles'); }
  async createRole(data: any) { return this.post('/roles', data); }
  async updateRole(id: string, data: any) { return this.put(`/roles/${id}`, data); }
  async deleteRole(id: string) { return this.delete(`/roles/${id}`); }
  async getAllPermissions() { return this.get('/roles/permissions'); }
  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    return this.post(`/roles/${roleId}/permissions`, { permissionIds });
  }

  // ─── Customer Management ─────────────────────────────────────────────────
  async getCustomers() { return this.get('/customers'); }
  async createCustomer(data: any) { return this.post('/customers', data); }
  async updateCustomer(id: string, data: any) { return this.put(`/customers/${id}`, data); }
  async deleteCustomer(id: string) { return this.delete(`/customers/${id}`); }

  // ─── Supplier Management ─────────────────────────────────────────────────
  async getSuppliers() { return this.get('/suppliers'); }
  async createSupplier(data: any) { return this.post('/suppliers', data); }
  async updateSupplier(id: string, data: any) { return this.put(`/suppliers/${id}`, data); }
  async deleteSupplier(id: string) { return this.delete(`/suppliers/${id}`); }

  // ─── Particulars ─────────────────────────────────────────────────────────
  async getParticulars(type?: 'RECEIPT' | 'CHALLAN') {
    return this.get('/particulars', { params: { type } });
  }
  async createParticular(data: any) { return this.post('/particulars', data); }
  async updateParticular(id: string, data: any) { return this.put(`/particulars/${id}`, data); }
  async deleteParticular(id: string) { return this.delete(`/particulars/${id}`); }

  // ─── Receipt Management ───────────────────────────────────────────────────
  async getReceipts(filters?: any) { return this.get('/receipts', { params: filters }); }
  async createReceipt(data: any) { return this.post('/receipts', data); }
  async approveReceipt(id: string, note?: string) {
    return this.post(`/receipts/${id}/approve`, { note });
  }
  async rejectReceipt(id: string, reason?: string) {
    return this.post(`/receipts/${id}/reject`, { reason });
  }
  async collectRemaining(id: string, data: { paymentMode?: string; paymentDate?: string }) {
    return this.post(`/receipts/${id}/collect-remaining`, data);
  }
  async generateReceiptPDF(id: string) {
    const r = await this.api.get(`/receipts/${id}/pdf`, { responseType: 'blob' });
    return r.data;
  }
  // Receipt edit/delete go through change requests (direct PUT/DELETE not allowed)
  async requestReceiptEdit(receiptId: string, reason: string, newData: any) {
    return this.post('/change-requests', { entityType: 'RECEIPT', entityId: receiptId, action: 'UPDATE', reason, newData });
  }
  async requestReceiptDelete(receiptId: string, reason: string) {
    return this.post('/change-requests', { entityType: 'RECEIPT', entityId: receiptId, action: 'DELETE', reason });
  }

  // ─── Challan Management ───────────────────────────────────────────────────
  async getChallans(filters?: any) { return this.get('/challans', { params: filters }); }
  async createChallan(data: any) { return this.post('/challans', data); }
  async approveChallan(id: string) { return this.post(`/challans/${id}/approve`); }
  async rejectChallan(id: string, note?: string) { return this.post(`/challans/${id}/reject`, { note }); }
  async requestChallanEdit(challanId: string, reason: string, newData: any) {
    return this.post('/change-requests', { entityType: 'CHALLAN', entityId: challanId, action: 'UPDATE', reason, newData });
  }

  // ─── Change Requests ─────────────────────────────────────────────────────
  async getChangeRequests(filters?: any) { return this.get('/change-requests', { params: filters }); }
  async createChangeRequest(data: any) { return this.post('/change-requests', data); }
  async approveChangeRequest(id: string, reviewNote?: string) {
    return this.post(`/change-requests/${id}/approve`, { reviewNote });
  }
  async rejectChangeRequest(id: string, reviewNote: string) {
    return this.post(`/change-requests/${id}/reject`, { reviewNote });
  }

  // ─── Transactions ─────────────────────────────────────────────────────────
  async getTransactions(filters?: any) { return this.get('/transactions', { params: filters }); }

  // ─── Staff Payment Gateway (store-admin facing) ───────────────────────────
  async initiatePayment(receiptId: string, amount: number) {
    return this.post('/payments/create-order', { receiptId, amount });
  }
  async verifyPayment(paymentId: string, orderId: string, signature: string, receiptId: string) {
    return this.post('/payments/verify', { paymentId, orderId, signature, receiptId });
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  async getDashboardStats() { return this.get('/dashboard/stats'); }
  async getRecentReceipts(limit: number = 10) {
    return this.get('/dashboard/recent-receipts', { params: { limit } });
  }
  // Financial summary card on ReportsPage — no date range needed for the card widget
  async getFinancialReport(startDate?: string, endDate?: string) {
    return this.get('/dashboard/financial-summary', { params: { startDate, endDate } });
  }

  // ─── Reports & Exports ────────────────────────────────────────────────────
  private async _downloadBlob(url: string, params: any, filename: string) {
    const r = await this.api.get(url, { params, responseType: 'blob' });
    const href = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    window.URL.revokeObjectURL(href);
  }
  async exportReceiptsToExcel(startDate: string, endDate: string) {
    return this._downloadBlob('/reports/export/receipts/excel', { startDate, endDate }, `receipts_${Date.now()}.xlsx`);
  }
  async exportFinancialReport(startDate: string, endDate: string) {
    return this._downloadBlob('/reports/export/financial/excel', { startDate, endDate }, `financial_report_${Date.now()}.xlsx`);
  }
  async exportData(type: string, filters?: any) {
    const r = await this.api.get(`/reports/export/${type}`, { params: filters, responseType: 'blob' });
    return r.data;
  }
  async importData(type: string, file: File) {
    const fd = new FormData(); fd.append('file', file);
    return this.post(`/reports/import/${type}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }

  // ─── Notifications ────────────────────────────────────────────────────────
  async getNotifications() { return this.get('/notifications'); }
  async getUnreadNotificationCount() { return this.get('/notifications/unread-count'); }
  async markNotificationRead(id: string) { return this.patch(`/notifications/${id}/read`); }

  // ─── News & Events ────────────────────────────────────────────────────────
  async getNewsEvents() { return this.get('/news-events'); }
  async createNewsEvent(data: any) { return this.post('/news-events', data); }
  async updateNewsEvent(id: string, data: any) { return this.put(`/news-events/${id}`, data); }
  async deleteNewsEvent(id: string) { return this.delete(`/news-events/${id}`); }

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  async getAuditLogs(filters?: any) { return this.get('/audit-logs', { params: filters }); }

  // ─── Store Settings ───────────────────────────────────────────────────────
  // SettingsPage uses apiService.get/put directly — these wrappers kept for
  // any future typed callers.
  async getStoreSettings() { return this.get('/store-settings'); }
  async updateStoreSettings(data: any) { return this.put('/store-settings', data); }

  // ─── Super Admin ──────────────────────────────────────────────────────────
  async getAllStoresForSuperAdmin() { return this.get('/super-admin/stores'); }
  async getSuperAdminSubscriptions() { return this.get('/super-admin/subscriptions'); }
  async upsertSubscription(storeId: string, data: any) {
    return this.post(`/super-admin/subscriptions/${storeId}`, data);
  }
  async extendSubscription(storeId: string, months: number) {
    return this.post(`/super-admin/subscriptions/${storeId}/extend`, { months });
  }
  async suspendSubscription(storeId: string) {
    return this.post(`/super-admin/subscriptions/${storeId}/suspend`);
  }
  async getSystemSettings() { return this.get('/super-admin/system-settings'); }
  async upsertSystemSetting(data: any) { return this.post('/super-admin/system-settings', data); }

  // ─── Customer Portal ──────────────────────────────────────────────────────
  async updateCustomerProfile(data: any) { return this.put('/customer-profile', data); }
  async getCustomerReceipts() { return this.get('/customer-profile/receipts'); }
  async getCustomerStats() { return this.get('/customer-profile/stats'); }
  async getCustomerTransactions() { return this.get('/customer-profile/transactions'); }
  async getCustomerStoreExpenses() { return this.get('/customer-profile/store-expenses'); }
  async customerSendMobileOtp(mobile: string) {
    return this.post('/customer-profile/send-mobile-otp', { mobile });
  }
  async customerVerifyMobileOtp(mobile: string, otp: string) {
    return this.post('/customer-profile/verify-mobile-otp', { mobile, otp });
  }
  async customerChangePassword(currentPassword: string, newPassword: string) {
    return this.post('/customer-profile/change-password', { currentPassword, newPassword });
  }
  // Customer PDF — separate endpoint that validates customer ownership, no store header needed
  async getCustomerReceiptPdf(receiptId: string) {
    const r = await this.api.get(`/customer-profile/receipts/${receiptId}/pdf`, { responseType: 'blob' });
    return r.data;
  }
  async customerRequestCashPayment(receiptId: string, amount: number, storeId: string) {
    return this.post('/customer-payments/request-cash-payment', { receiptId, amount, storeId });
  }
  async customerCancelCashRequest(receiptId: string) {
    return this.delete(`/customer-payments/cancel-cash-request/${receiptId}`);
  }
  async initiateCustomerOnlinePayment(receiptId: string, storeId: string) {
    return this.post('/customer-payments/pay-online', { receiptId, storeId });
  }
  async verifyCustomerOnlinePayment(
    paymentId: string, orderId: string, signature: string, receiptId: string, storeId: string
  ) {
    return this.post('/customer-payments/verify-online', { paymentId, orderId, signature, receiptId, storeId });
  }
}

export const apiService = new ApiService();
