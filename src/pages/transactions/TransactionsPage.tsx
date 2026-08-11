import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';

export const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RECEIPT' | 'CHALLAN'>('ALL');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', searchTerm, filterType],
    queryFn: () => apiService.getTransactions({ search: searchTerm, type: filterType === 'ALL' ? undefined : filterType }),
  });

  const getTypeColor = (type: string) => {
    return type === 'RECEIPT' ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">Total Receipts</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{transactions?.DDMS_data?.summary?.totalReceipts?.toLocaleString() || 0}
                </p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600">Total Challans</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{transactions?.DDMS_data?.summary?.totalChallans?.toLocaleString() || 0}
                </p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <div>
              <p className="text-sm text-secondary-600">Net Balance</p>
              <p className="text-2xl font-bold text-primary-600">
                ₹{(transactions?.DDMS_data?.summary?.netBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Transactions ({transactions?.DDMS_data?.total || 0})</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="ALL">All Types</option>
                <option value="RECEIPT">Receipts</option>
                <option value="CHALLAN">Challans</option>
              </Select>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {t('common.filter')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Reference Number</th>
                <th className="table-header-cell">Party</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">Payment Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {transactions?.DDMS_data?.transactions?.map((transaction: any) => (
                <tr key={transaction.id} className="hover:bg-secondary-50">
                  <td className="table-cell">{new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="table-cell font-medium">{transaction.reference_number || '-'}</td>
                  <td className="table-cell">
                    {transaction.type === 'RECEIPT' ? transaction.customer_name : transaction.supplier_name}
                  </td>
                  <td className="table-cell">
                    <span className={transaction.type === 'RECEIPT' ? 'text-green-600 font-semibold' : 'text-blue-600 font-semibold'}>
                      {transaction.type === 'RECEIPT' ? '+' : '-'}₹{Number(transaction.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="table-cell">{transaction.payment_mode || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
