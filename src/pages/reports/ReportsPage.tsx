import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Calendar, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('receipts');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importType, setImportType] = useState('customers');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: financialData } = useQuery({
    queryKey: ['financial-report'],
    queryFn: () => apiService.getFinancialReport(),
  });
  const fin = financialData?.DDMS_data;

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://ddback.daanoday.com/api'}/reports/import/template/${importType}`,
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token}`, 'X-Store-ID': useAuthStore.getState().currentStore?.id || '' } }
      );
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importType}-import-template.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download template'); }
  };

  const handleImport = async () => {
    if (!importFile) { toast.error('Please select a file'); return; }
    try {
      setIsImporting(true);
      const result = await apiService.importData(importType, importFile);
      const d = result?.DDMS_data;
      toast.success(`Imported ${d?.inserted ?? 0} records. Skipped: ${d?.skipped ?? 0}`);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      toast.error(e?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };
    if (!startDate || !endDate) {
      toast.error('Please select date range');
      return;
    }
    
    try {
      setIsExporting(true);
      
      if (type === 'receipts') {
        await apiService.exportReceiptsToExcel(startDate, endDate);
      } else if (type === 'financial') {
        await apiService.exportFinancialReport(startDate, endDate);
      } else {
        const blob = await apiService.exportData(type, { startDate, endDate });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const reports = [
    {
      id: 'receipts',
      title: 'Receipts Report',
      description: 'Export all receipt transactions with details',
      icon: FileText,
      color: 'text-green-600 bg-green-100',
    },
    {
      id: 'challans',
      title: 'Challans Report',
      description: 'Export all challan transactions with details',
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      id: 'customers',
      title: 'Customers Report',
      description: 'Export customer database with transaction history',
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      id: 'suppliers',
      title: 'Suppliers Report',
      description: 'Export supplier database with transaction history',
      icon: Users,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      id: 'transactions',
      title: 'Transactions Report',
      description: 'Export complete transaction history',
      icon: DollarSign,
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      id: 'financial',
      title: 'Financial Summary',
      description: 'Export financial summary and analytics',
      icon: TrendingUp,
      color: 'text-red-600 bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-secondary-600 mt-1">
            Generate and export various reports for your temple
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <div className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id}>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{report.title}</h3>
                    <p className="text-sm text-secondary-600 mb-4">
                      {report.description}
                    </p>
                    <Button
                      onClick={() => handleExport(report.id)}
                      disabled={isExporting}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exporting...' : 'Export Report'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Statistics</CardTitle>
        </CardHeader>
        <div className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-1">Total Receipts</p>
              <p className="text-2xl font-bold text-green-600">{fin?.receipts?.count ?? "-"}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-1">Total Challans</p>
              <p className="text-2xl font-bold text-blue-600">{fin?.challans?.count ?? "-"}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-purple-600">-</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-1">Net Balance</p>
              <p className="text-2xl font-bold text-primary-600">{fin ? `₹${Number(fin.net || 0).toLocaleString("en-IN")}` : "-"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
        </CardHeader>
        <div className="p-6 pt-0">
          <p className="text-sm text-secondary-600 mb-4">
            Import data from Excel/CSV files. Download the template first to ensure proper formatting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Select value={importType} onChange={(e) => setImportType(e.target.value)}>
                <option value="customers">Customers</option>
                <option value="suppliers">Suppliers</option>
                <option value="particulars">Particulars</option>
              </Select>
              <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="block w-full text-sm text-secondary-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 border border-secondary-300 rounded-md p-1"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <Button className="w-full" onClick={handleImport} disabled={isImporting || !importFile}>
                {isImporting ? 'Importing...' : 'Import File'}
              </Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-secondary-500 space-y-1">
            <p>• <strong>Customers:</strong> Name*, Mobile*, Email, Address, Password</p>
            <p>• <strong>Suppliers:</strong> Company Name*, Contact Person, Phone, Email, Address</p>
            <p>• <strong>Particulars:</strong> Name*, Type* (RECEIPT or CHALLAN)</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
