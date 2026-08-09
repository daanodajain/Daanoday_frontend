import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { DDMSResponse } from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.NEXT_PUBLIC_API_URL || 'https://ddback.daanoday.com/api',
      headers: {
      'Content-Type': 'application/json'
    }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const { token, currentStore } = useAuthStore.getState();
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (currentStore) {
          config.headers['X-Store-ID'] = currentStore.id;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse<DDMSResponse>) => {
        if (response.data?.status === 'ERROR') {
          return Promise.reject(new Error(response.data.DDMS_error_code || 'An error occurred'));
        }
        return response;
      },
      async (error) => {
        if (error.config?.url?.includes('/auth/refresh') || error.config?._retry) {
          useAuthStore.getState().logout();
          return Promise.reject(new Error('Session expired. Please login again.'));
        }

        if (error.response?.status === 401) {
          const { refreshToken, isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated || !refreshToken) {
            useAuthStore.getState().logout();
            return Promise.reject(error);
          }
          error.config._retry = true;
          try {
            const res = await axios.post<DDMSResponse>(
              `${import.meta.env.VITE_API_BASE_URL || import.meta.env.NEXT_PUBLIC_API_URL || 'https://ddback.daanoday.com/api'}/auth/refresh`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.data?.status === 'SUCCESS' && res.data.DDMS_data) {
              const { token: newToken, refreshToken: newRefreshToken } = res.data.DDMS_data;
              const { user } = useAuthStore.getState();
              if (user && newToken) {
                useAuthStore.getState().setAuth(user, newToken, newRefreshToken || refreshToken);
                return this.api.request(error.config);
              }
            }
            throw new Error('Refresh failed');
          } catch {
            useAuthStore.getState().logout();
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(identifier: string, password: string) {
    const response = await this.api.post<DDMSResponse>('/auth/login', {
      identifier,
      password,
    });
    return response.data;
  }

  async changePassword(newPassword: string) {
    const response = await this.api.post<DDMSResponse>('/auth/change-password', {
      newPassword,
    });
    return response.data;
  }


  async refreshAuthToken(refreshToken: string) {
    const response = await this.api.post<DDMSResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  }

  async logout() {
    const response = await this.api.post<DDMSResponse>('/auth/logout');
    return response.data;
  }

  async unlockSession(password: string) {
    const response = await this.api.post<DDMSResponse>('/auth/unlock', { password });
    return response.data;
  }

  // Store Management
  async  getStores() {
    const response = await this.api.get<DDMSResponse>('/stores');
    return response.data;
  }

  async createStore(storeData: any) {
    const response = await this.api.post<DDMSResponse>('/stores', storeData);
    return response.data;
  }

  async updateStore(storeId: string, storeData: any) {
    const response = await this.api.put<DDMSResponse>(`/stores/${storeId}`, storeData);
    return response.data;
  }

  async createStoreWithAdmin(storeWithAdminData: any) {
    const response = await this.api.post<DDMSResponse>('/stores/with-admin', storeWithAdminData);
    return response.data;
  }

  // User Management
  async getUsers() {
    const response = await this.api.get<DDMSResponse>('/users');
    return response.data;
  }

  async createUser(userData: any) {
    const response = await this.api.post<DDMSResponse>('/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: any) {
    const response = await this.api.put<DDMSResponse>(`/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.api.delete<DDMSResponse>(`/users/${userId}`);
    return response.data;
  }

  // Customer Management
  async getCustomers() {
    const response = await this.api.get<DDMSResponse>('/customers');
    return response.data;
  }

  async createCustomer(customerData: any) {
    const response = await this.api.post<DDMSResponse>('/customers', customerData);
    return response.data;
  }

  async updateCustomer(customerId: string, customerData: any) {
    const response = await this.api.put<DDMSResponse>(`/customers/${customerId}`, customerData);
    return response.data;
  }

  async deleteCustomer(customerId: string) {
    const response = await this.api.delete<DDMSResponse>(`/customers/${customerId}`);
    return response.data;
  }

  // Supplier Management
  async getSuppliers() {
    const response = await this.api.get<DDMSResponse>('/suppliers');
    return response.data;
  }

  async createSupplier(supplierData: any) {
    const response = await this.api.post<DDMSResponse>('/suppliers', supplierData);
    return response.data;
  }

  async updateSupplier(supplierId: string, supplierData: any) {
    const response = await this.api.put<DDMSResponse>(`/suppliers/${supplierId}`, supplierData);
    return response.data;
  }

  async deleteSupplier(supplierId: string) {
    const response = await this.api.delete<DDMSResponse>(`/suppliers/${supplierId}`);
    return response.data;
  }

  // Particulars Management
  async getParticulars(type?: 'RECEIPT' | 'CHALLAN') {
    const response = await this.api.get<DDMSResponse>('/particulars', {
      params: { type },
    });
    return response.data;
  }

  async createParticular(particularData: any) {
    const response = await this.api.post<DDMSResponse>('/particulars', particularData);
    return response.data;
  }

  async updateParticular(particularId: string, particularData: any) {
    const response = await this.api.put<DDMSResponse>(`/particulars/${particularId}`, particularData);
    return response.data;
  }

  async deleteParticular(particularId: string) {
    const response = await this.api.delete<DDMSResponse>(`/particulars/${particularId}`);
    return response.data;
  }

  // Receipt Management
  async getReceipts(filters?: any) {
    const response = await this.api.get<DDMSResponse>('/receipts', { params: filters });
    return response.data;
  }

  async createReceipt(receiptData: any) {
    const response = await this.api.post<DDMSResponse>('/receipts', receiptData);
    return response.data;
  }

  async updateReceipt(receiptId: string, receiptData: any) {
    // Direct update not allowed — must use change request
    return await this.post('/change-requests', {
      entityType: 'RECEIPT',
      entityId: receiptId,
      action: 'UPDATE',
      ...receiptData,
    });
  }

  async deleteReceipt(receiptId: string, reason: string) {
    return await this.post('/change-requests', {
      entityType: 'RECEIPT',
      entityId: receiptId,
      action: 'DELETE',
      reason,
    });
  }

  async approveReceipt(receiptId: string) {
    const response = await this.api.post<DDMSResponse>(`/receipts/${receiptId}/approve`);
    return response.data;
  }

  async generateReceiptPDF(receiptId: string) {
    const response = await this.api.get(`/receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Challan Management
  async getChallans(filters?: any) {
    const response = await this.api.get<DDMSResponse>('/challans', { params: filters });
    return response.data;
  }

  async createChallan(challanData: any) {
    const response = await this.api.post<DDMSResponse>('/challans', challanData);
    return response.data;
  }

  async updateChallan(challanId: string, challanData: any) {
    return await this.post('/change-requests', {
      entityType: 'CHALLAN',
      entityId: challanId,
      action: 'UPDATE',
      ...challanData,
    });
  }

  async deleteChallan(challanId: string, reason: string) {
    return await this.post('/change-requests', {
      entityType: 'CHALLAN',
      entityId: challanId,
      action: 'DELETE',
      reason,
    });
  }

  async approveChallan(challanId: string) {
    const response = await this.api.post<DDMSResponse>(`/challans/${challanId}/approve`);
    return response.data;
  }

  async rejectChallan(challanId: string, note?: string) {
    const response = await this.api.post<DDMSResponse>(`/challans/${challanId}/reject`, { note });
    return response.data;
  }

  // Transaction Management
  async getTransactions(filters?: any) {
    const response = await this.api.get<DDMSResponse>('/transactions', { params: filters });
    return response.data;
  }

  // Change Requests
  async getChangeRequests(filters?: any) {
    return await this.get('/change-requests', { params: filters });
  }

  async createChangeRequest(data: { entityType: string; entityId: string; action: string; reason: string; newData?: any }) {
    return await this.post('/change-requests', data);
  }

  async approveChangeRequest(id: string, reviewNote?: string) {
    return await this.post(`/change-requests/${id}/approve`, { reviewNote });
  }

  async rejectChangeRequest(id: string, reviewNote: string) {
    return await this.post(`/change-requests/${id}/reject`, { reviewNote });
  }

  // Audit Logs
  async getAuditLogs(filters?: any) {
    return await this.get('/audit-logs', { params: filters });
  }

  // Dashboard
  async getDashboardRevenue(days: number = 30) {
    return await this.get('/dashboard/revenue', { params: { days } });
  }

  async getPaymentModeDistribution() {
    return await this.get('/dashboard/payment-modes');
  }

  async getMonthlyStats() {
    return await this.get('/dashboard/monthly');
  }

  async getRecentReceipts(limit: number = 10) {
    return await this.get('/dashboard/recent-receipts', { params: { limit } });
  }

  async exportData(type: string, filters?: any) {
    const response = await this.api.get(`/reports/export/${type}`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  async importData(type: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.api.post<DDMSResponse>(`/reports/import/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Dashboard
  async getDashboardStats() {
    const response = await this.api.get<DDMSResponse>('/dashboard/stats');
    return response.data;
  }

  // Notifications — correct backend endpoints
  async getNotifications() {
    const response = await this.api.get<DDMSResponse>('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.api.patch<DDMSResponse>(`/notifications/${notificationId}/read`);
    return response.data;
  }

  // News & Events
  async getNewsEvents() {
    const response = await this.api.get<DDMSResponse>('/news-events');
    return response.data;
  }

  async createNewsEvent(newsEventData: any) {
    const response = await this.api.post<DDMSResponse>('/news-events', newsEventData);
    return response.data;
  }

  async updateNewsEvent(newsEventId: string, newsEventData: any) {
    const response = await this.api.put<DDMSResponse>(`/news-events/${newsEventId}`, newsEventData);
    return response.data;
  }

  async deleteNewsEvent(newsEventId: string) {
    const response = await this.api.delete<DDMSResponse>(`/news-events/${newsEventId}`);
    return response.data;
  }

  // Payment Gateway
  async initiatePayment(receiptId: string, amount: number) {
    return await this.post('/payments/create-order', { receiptId, amount });
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string, receiptId: string) {
    return await this.post('/payments/verify', { paymentId, orderId, signature, receiptId });
  }

  async refundPayment(paymentId: string, receiptId: string) {
    return await this.post('/payments/refund', { paymentId, receiptId });
  }

  async getPaymentDetails(paymentId: string) {
    return await this.get(`/payments/details/${paymentId}`);
  }

  // Receipt Approval
  async rejectReceipt(receiptId: string) {
    return await this.post(`/receipts/${receiptId}/reject`);
  }

  async getPendingApprovals() {
    return await this.get('/dashboard/pending-approvals');
  }

  // Advanced Reports
  async getReceiptReport(startDate: string, endDate: string, customerId?: string, paymentMode?: string) {
    return await this.get('/reports/receipts', { params: { startDate, endDate, customerId, paymentMode } });
  }

  async getFinancialReport(startDate: string, endDate: string) {
    return await this.get('/reports/financial', { params: { startDate, endDate } });
  }

  async getCustomerDonationHistory(customerId: string) {
    return await this.get(`/reports/customer-history/${customerId}`);
  }

  async exportReceiptsToExcel(startDate: string, endDate: string) {
    const response = await this.api.get('/reports/export/receipts/excel', {
      params: { startDate, endDate },
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipts_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async exportReceiptsToTally(startDate: string, endDate: string) {
    const response = await this.api.get('/reports/export/receipts/tally', {
      params: { startDate, endDate },
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipts_tally_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async exportFinancialReport(startDate: string, endDate: string) {
    const response = await this.api.get('/reports/export/financial/excel', {
      params: { startDate, endDate },
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial_report_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Store Settings
  async getStoreSettings() {
    return await this.get('/store-settings');
  }

  async updateStoreSettings(settings: any) {
    return await this.put('/store-settings', settings);
  }

  async updatePaymentGatewaySettings(settings: any) {
    return await this.put('/store-settings/payment-gateway', settings);
  }

  async updateSmsSettings(settings: any) {
    return await this.put('/store-settings/sms-settings', settings);
  }

  async updateEmailSettings(settings: any) {
    return await this.put('/store-settings/email-settings', settings);
  }

  // Audit Logs (old duplicate removed — use getAuditLogs above)
  async getEntityAuditHistory(entityName: string, entityId: string) {
    return await this.get(`/audit/entity/${entityName}/${entityId}`);
  }

  // Customer Portal
  async customerSendOTP(mobile: string) {
    return await this.post('/customer-auth/send-otp', { mobile });
  }

  async customerLogin(mobile: string, password?: string, otp?: string) {
    return await this.post('/customer-auth/login', { mobile, password, otp });
  }

  async getCustomerProfile() {
    return await this.get('/customer-profile');
  }

  async updateCustomerProfile(data: any) {
    return await this.put('/customer-profile', data);
  }

  async getCustomerReceipts() {
    return await this.get('/customer-profile/receipts');
  }

  async getCustomerStats() {
    return await this.get('/customer-profile/stats');
  }

  // Super Admin — correct endpoints matching backend routes
  async getSuperAdminSubscriptions() {
    return await this.get('/super-admin/subscriptions');
  }

  async upsertSubscription(storeId: string, data: any) {
    return await this.post(`/super-admin/subscriptions/${storeId}`, data);
  }

  async extendSubscription(storeId: string, months: number) {
    return await this.post(`/super-admin/subscriptions/${storeId}/extend`, { months });
  }

  async suspendSubscription(storeId: string) {
    return await this.post(`/super-admin/subscriptions/${storeId}/suspend`);
  }

  async getSystemSettings() {
    return await this.get('/super-admin/system-settings');
  }

  async upsertSystemSetting(key: string, value: any) {
    return await this.post('/super-admin/system-settings', { key, value });
  }

  async getAllStoresForSuperAdmin() {
    return await this.get('/super-admin/stores');
  }

  async createStoreWithAdminSuperAdmin(data: any) {
    return await this.post('/super-admin/stores', data);
  }

  async deleteStoreSuperAdmin(storeId: string) {
    return await this.delete(`/super-admin/stores/${storeId}`);
  }

  // Dashboard Analytics (old duplicates removed — canonical versions above)
  async getReceiptTypeDistribution() {
    return await this.get('/dashboard/distribution/receipt-types');
  }

  async getRecentTransactions(limit: number = 10) {
    return await this.get('/dashboard/recent-receipts', { params: { limit } });
  }

  async getCustomerGrowth(months: number = 12) {
    return await this.get('/dashboard/growth/customers', { params: { months } });
  }

  async getDailyTrend(days: number = 30) {
    return await this.get('/dashboard/trend/daily', { params: { days } });
  }
  async getYearlyComparison() {
    return await this.get('/dashboard/comparison/yearly');
  }

  // Role Management
  async getRoles() {
    return await this.get('/roles');
  }

  async getRole(roleId: string) {
    return await this.get(`/roles/${roleId}`);
  }

  async createRole(roleData: any) {
    return await this.post('/roles', roleData);
  }

  async updateRole(roleId: string, roleData: any) {
    return await this.put(`/roles/${roleId}`, roleData);
  }

  async deleteRole(roleId: string) {
    return await this.delete(`/roles/${roleId}`);
  }

  async getAllPermissions() {
    return await this.get('/roles/permissions');
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    return await this.post(`/roles/${roleId}/permissions`, { permissionIds });
  }

  async assignRolesToUser(userId: string, roleIds: string[]) {
    return await this.post(`/roles/users/${userId}/roles`, { roleIds });
  }

  async getUserRoles(userId: string) {
    return await this.get(`/roles/users/${userId}`);
  }

  // Notification System
  async createNotification(notificationData: any) {
    return await this.post('/notifications', notificationData);
  }

  async deleteNotification(notificationId: string) {
    return await this.delete(`/notifications/${notificationId}`);
  }

  async markAllNotificationsRead() {
    return await this.put('/notifications/mark-all-read');
  }

  async getUnreadNotificationCount() {
    return await this.get('/notifications/unread-count');
  }

  // User Profile
  async getUserProfile() {
    return await this.get('/user-profile');
  }

  async updateUserProfile(profileData: any) {
    return await this.put('/user-profile', profileData);
  }

  // Renamed from changePassword to avoid colliding with the first-login
  // changePassword(newPassword) above — a duplicate method name here was
  // silently overwriting that one, breaking the first-login "set password" flow.
  async changePasswordWithOldPassword(oldPassword: string, newPassword: string) {
    return await this.post('/user-profile/change-password', { oldPassword, newPassword });
  }

  // Store Context
  async switchStore(storeId: string) {
    return await this.post(`/store-context/switch/${storeId}`);
  }

  // User toggle status
  async toggleUserStatus(userId: string) {
    return await this.patch(`/users/${userId}/toggle-status`);
  }

  // User assign role in store
  async assignRoleInStore(userId: string, roleId: string) {
    return await this.post(`/users/${userId}/assign-role`, { roleId });
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any) {
    const response = await this.api.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any) {
    const response = await this.api.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any) {
    const response = await this.api.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any) {
    const response = await this.api.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any) {
    const response = await this.api.delete<T>(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();