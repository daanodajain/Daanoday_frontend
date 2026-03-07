import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  UserCheck, 
  Receipt, 
  FileBarChart, 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalReceipts: number;
  totalChallans: number;
  totalTransactions: number;
  monthlyRevenue: number;
  pendingApprovals: number;
  activeSubscriptions: number;
}

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentStore } = useAuthStore();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', currentStore?.id],
    queryFn: () => apiService.getDashboardStats(),
    enabled: !!currentStore,
  });

  useEffect(() => {
    if (currentStore) {
      loadPendingApprovals();
      loadRecentTransactions();
    }
  }, [currentStore]);

  const loadPendingApprovals = async () => {
    try {
      const response = await apiService.getPendingApprovals();
      if (response.DDMS_status === 'success') {
        setPendingApprovals(response.DDMS_data || []);
      }
    } catch (error) {
      console.error('Failed to load pending approvals');
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await apiService.getRecentTransactions(5);
      if (response.DDMS_status === 'success') {
        setRecentTransactions(response.DDMS_data || []);
      }
    } catch (error) {
      console.error('Failed to load recent transactions');
    }
  };

  const handleApprove = async (receiptId: string) => {
    try {
      await apiService.approveReceipt(receiptId);
      toast.success('Receipt approved successfully');
      loadPendingApprovals();
    } catch (error) {
      toast.error('Failed to approve receipt');
    }
  };

  const handleReject = async (receiptId: string) => {
    try {
      await apiService.rejectReceipt(receiptId);
      toast.success('Receipt rejected');
      loadPendingApprovals();
    } catch (error) {
      toast.error('Failed to reject receipt');
    }
  };

  const statsCards = [
    {
      title: t('navigation.users'),
      value: stats?.DDMS_data?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('navigation.customers'),
      value: stats?.DDMS_data?.totalCustomers || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('navigation.receipts'),
      value: stats?.DDMS_data?.totalReceipts || 0,
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('navigation.challans'),
      value: stats?.DDMS_data?.totalChallans || 0,
      icon: FileBarChart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: t('navigation.transactions'),
      value: stats?.DDMS_data?.totalTransactions || 0,
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats?.DDMS_data?.monthlyRevenue?.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.DDMS_data?.activeSubscriptions || 0,
      icon: CheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-secondary-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-secondary-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome to {currentStore?.name || 'Daanoday'}
        </h1>
        <p className="text-primary-100">
          Manage your temple donations and operations efficiently
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                    <div>
                      <p className="font-medium text-secondary-900">{receipt.receiptNumber}</p>
                      <p className="text-sm text-secondary-600">{receipt.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-secondary-900">₹{receipt.totalAmount?.toLocaleString()}</p>
                      <p className="text-sm text-green-600">{receipt.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary-500 text-center py-4">No recent receipts</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals ({pendingApprovals.length})</CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-secondary-900">{receipt.receiptNumber}</p>
                      <p className="text-sm text-secondary-600">₹{receipt.totalAmount?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(receipt.id)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(receipt.id)}>Reject</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary-500 text-center py-4">No pending approvals</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};