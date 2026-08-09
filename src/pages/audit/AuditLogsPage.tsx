import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Calendar, User, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

export const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    entityName: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAuditLogs(filters);
      if (response.status === 'SUCCESS') {
        setLogs(response.DDMS_data || []);
      }
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log =>
    log.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold">Audit Logs</h1>
        <Button onClick={loadAuditLogs} size="sm">
          Refresh
        </Button>
      </div>

      {/* Mobile-First Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Filters</CardTitle>
        </CardHeader>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              placeholder="Start Date"
            />
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              placeholder="End Date"
            />
            <Button onClick={loadAuditLogs} className="w-full">
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Mobile-First Logs Display */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No audit logs found
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-medium truncate">{log.entityName}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="truncate">User ID: {log.userId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">Entity ID: {log.entityId}</span>
                  </div>
                </div>

                {log.ipAddress && (
                  <div className="text-xs text-gray-500">
                    IP: {log.ipAddress}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
