import React, { useEffect, useState } from 'react';
import { Receipt, CreditCard, Bell, User, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const CustomerDashboard: React.FC = () => {
  const [stats, setStats] = useState({ totalDonations: 0, totalAmount: 0, recentReceipts: 0 });
  const [receipts, setReceipts] = useState<any[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    loadStats();
    loadReceipts();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiService.getCustomerStats();
      if (response.DDMS_status === 'success') {
        setStats(response.DDMS_data);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const loadReceipts = async () => {
    try {
      const response = await apiService.getCustomerReceipts();
      if (response.DDMS_status === 'success') {
        setReceipts(response.DDMS_data || []);
      }
    } catch (error) {
      console.error('Failed to load receipts');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
          <h1 className="text-xl md:text-2xl font-bold mb-2">Welcome, {user?.name}</h1>
          <p className="text-sm md:text-base text-primary-100">View your donation history and receipts</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Donations</p>
                <p className="text-2xl md:text-3xl font-bold">{stats.totalDonations}</p>
              </div>
              <Receipt className="h-10 w-10 md:h-12 md:w-12 text-primary-600" />
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl md:text-3xl font-bold">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <CreditCard className="h-10 w-10 md:h-12 md:w-12 text-green-600" />
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Recent Receipts</p>
                <p className="text-2xl md:text-3xl font-bold">{stats.recentReceipts}</p>
              </div>
              <Bell className="h-10 w-10 md:h-12 md:w-12 text-blue-600" />
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Recent Donations</h2>
            <div className="space-y-3">
              {receipts.length > 0 ? (
                receipts.slice(0, 5).map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{receipt.receiptNumber}</p>
                      <p className="text-xs md:text-sm text-gray-600">{new Date(receipt.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-sm md:text-base">₹{receipt.totalAmount?.toLocaleString()}</p>
                      <Button size="sm" variant="ghost" className="text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No donations yet</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
