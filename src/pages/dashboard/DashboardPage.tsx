import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Receipt, FileBarChart, CreditCard, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const { currentStore, isSuperAdmin } = useAuthStore();
  const { canApprove } = usePermissions();
  const queryClient = useQueryClient();

  // Super admin gets their own dashboard
  if (isSuperAdmin) return <SuperAdminDashboard />;

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboard-stats', currentStore?.id],
    queryFn: () => apiService.getDashboardStats(),
    enabled: !!currentStore,
  });

  const { data: recentData } = useQuery({
    queryKey: ['dashboard-recent', currentStore?.id],
    queryFn: () => apiService.getRecentReceipts(5),
    enabled: !!currentStore,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['receipts-pending', currentStore?.id],
    queryFn: () => apiService.getReceipts({ state: 'PENDING_APPROVAL' }),
    enabled: !!currentStore,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiService.approveReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts-pending'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Receipt approved ✅');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiService.rejectReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts-pending'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Receipt rejected');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to reject'),
  });

  const stats = statsData?.DDMS_data;
  const recentReceipts = recentData?.DDMS_data || [];
  const pendingReceipts = pendingData?.DDMS_data?.receipts || pendingData?.DDMS_data || [];

  const statsCards = [
    { title: 'Today Collection', value: `₹${Number(stats?.today?.collection || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Month Collection', value: `₹${Number(stats?.month?.collection || 0).toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Total Receipts', value: stats?.total?.receipts || 0, icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Total Customers', value: stats?.totalCustomers || 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Pending Approvals', value: stats?.pendingApprovals || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { title: 'Pending Changes', value: stats?.pendingChangeRequests || 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Today Receipts', value: stats?.today?.receipts || 0, icon: FileBarChart, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: 'Total Challans', value: stats?.total?.challans || 0, icon: FileBarChart, color: 'text-teal-600', bg: 'bg-teal-100' },
  ];

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-secondary-500 text-lg">No store selected</p>
          <p className="text-secondary-400 text-sm mt-1">Please select a store to continue</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6"><div className="h-16 bg-secondary-200 rounded" /></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">🏛️ {currentStore?.name}</h1>
        <p className="text-primary-100 text-sm">Manage your temple donations and operations efficiently</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Receipts</CardTitle></CardHeader>
          <div className="p-6 pt-0 space-y-3">
            {recentReceipts.length > 0 ? recentReceipts.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                <div>
                  <p className="font-medium text-secondary-900">{r.receipt_number}</p>
                  <p className="text-sm text-secondary-600">{r.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{Number(r.total_amount).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-secondary-500">{r.receipt_state}</p>
                </div>
              </div>
            )) : <p className="text-sm text-secondary-500 text-center py-8">No recent receipts</p>}
          </div>
        </Card>

        {canApprove('receipts') && (
          <Card>
            <CardHeader><CardTitle>Pending Approvals ({pendingReceipts.length})</CardTitle></CardHeader>
            <div className="p-6 pt-0 space-y-3">
              {pendingReceipts.length > 0 ? pendingReceipts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-secondary-900">{r.receipt_number}</p>
                    <p className="text-sm text-secondary-600">{r.customer_name} — ₹{Number(r.total_amount).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}>✓</Button>
                    <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(r.id)} disabled={rejectMutation.isPending}>✗</Button>
                  </div>
                </div>
              )) : <p className="text-sm text-secondary-500 text-center py-8">No pending approvals ✅</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
