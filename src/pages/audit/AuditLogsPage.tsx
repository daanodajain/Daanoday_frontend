import React, { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

const ACTION_LABELS: Record<string, string> = {
  RECEIPT_CREATED:        'Receipt Created',
  RECEIPT_APPROVED:       'Receipt Approved',
  RECEIPT_REJECTED:       'Receipt Rejected',
  RECEIPT_MARKED_PAID:    'Receipt Marked Paid',
  CHALLAN_CREATED:        'Challan Created',
  CHALLAN_CANCELLED:      'Challan Cancelled',
  CHALLAN_PAID:           'Challan Paid',
  CUSTOMER_CREATED:       'Customer Added',
  CHANGE_REQUEST_APPROVED:'Change Request Approved',
  CHANGE_REQUEST_REJECTED:'Change Request Rejected',
  SETTINGS_UPDATED:       'Settings Updated',
  ROLE_CREATED:           'Role Created',
  ROLE_UPDATED:           'Role Updated',
  ROLE_DELETED:           'Role Deleted',
  ROLE_CHANGED:           'User Role Changed',
  ROLE_PERMISSIONS_UPDATED:'Role Permissions Updated',
  USER_CREATED:           'User Created',
};

const ACTION_COLORS: Record<string, string> = {
  RECEIPT_CREATED:        'bg-green-100 text-green-800',
  RECEIPT_APPROVED:       'bg-green-100 text-green-800',
  RECEIPT_MARKED_PAID:    'bg-green-100 text-green-800',
  CHALLAN_CREATED:        'bg-blue-100 text-blue-800',
  CHALLAN_PAID:           'bg-blue-100 text-blue-800',
  RECEIPT_REJECTED:       'bg-red-100 text-red-800',
  CHALLAN_CANCELLED:      'bg-red-100 text-red-800',
  CHANGE_REQUEST_REJECTED:'bg-red-100 text-red-800',
  CHANGE_REQUEST_APPROVED:'bg-green-100 text-green-800',
  CUSTOMER_CREATED:       'bg-purple-100 text-purple-800',
};

const getColor = (action: string) => {
  if (ACTION_COLORS[action]) return ACTION_COLORS[action];
  if (action.includes('DELETE') || action.includes('REJECTED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-800';
  if (action.includes('CREATE') || action.includes('APPROVED')) return 'bg-green-100 text-green-800';
  if (action.includes('UPDATE') || action.includes('CHANGED')) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

const getDescription = (log: any) => {
  const by = log.user_name || `User #${log.user_id}`;
  const d = log.details || {};
  switch (log.action) {
    case 'RECEIPT_CREATED':     return `${by} created Receipt ${d.receipt_number || `#${log.entity_id}`} of ₹${d.amount} for ${d.customer_name || d.customer_mobile || ''} ${d.account_number ? `(${d.account_number})` : ''}`.trim();
    case 'RECEIPT_APPROVED':    return `${by} approved Receipt ${d.receipt_number || `#${log.entity_id}`} of ₹${d.amount}`;
    case 'RECEIPT_REJECTED':    return `${by} rejected Receipt ${d.receipt_number || `#${log.entity_id}`}${d.note ? ` — ${d.note}` : ''}`;
    case 'RECEIPT_MARKED_PAID': return `${by} marked Receipt ${d.receipt_number || `#${log.entity_id}`} as Paid via ${d.payment_mode}`;
    case 'CHALLAN_CREATED':     return `${by} created Challan ${d.challan_number || `#${log.entity_id}`} of ₹${d.amount}`;
    case 'CHALLAN_CANCELLED':   return `${by} cancelled Challan ${d.challan_number || `#${log.entity_id}`}${d.reason ? ` — ${d.reason}` : ''}`;
    case 'CHALLAN_PAID':        return `${by} marked Challan ${d.challan_number || `#${log.entity_id}`} as Paid`;
    case 'CUSTOMER_CREATED':    return `${by} added Customer ${d.name || ''} (${d.mobile || ''})`;
    case 'CHANGE_REQUEST_APPROVED': return `${by} approved Change Request #${log.entity_id}`;
    case 'CHANGE_REQUEST_REJECTED': return `${by} rejected Change Request #${log.entity_id}`;
    default: return `${by} — ${ACTION_LABELS[log.action] || log.action}${log.entity_id ? ` #${log.entity_id}` : ''}`;
  }
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ action: '', startDate: '', endDate: '' });

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action)    params.set('action', filters.action);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate)   params.set('endDate', filters.endDate);
      const response = await apiService.getAuditLogs(Object.fromEntries(params));
      if (response.status === 'SUCCESS') setLogs(response.DDMS_data || []);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action)    params.set('action', filters.action);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate)   params.set('endDate', filters.endDate);
      const token = localStorage.getItem('token');
      const storeId = localStorage.getItem('selectedStoreId');
      const url = `${import.meta.env.VITE_API_URL}/audit-logs/export?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'x-store-id': storeId || '' } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'audit-logs.xlsx';
      a.click();
      toast.success('Exported successfully');
    } catch { toast.error('Export failed'); }
  };

  const filtered = logs.filter(log => {
    const desc = getDescription(log).toLowerCase();
    return desc.includes(searchTerm.toLowerCase()) || log.action?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="p-4 md:p-6">
      <div className="animate-pulse space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Audit Logs</h1>
        <div className="flex gap-2">
          <Button onClick={loadLogs} size="sm" variant="outline">Refresh</Button>
          <Button onClick={handleExport} size="sm" className="flex items-center gap-1">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="border rounded px-3 py-2 text-sm"
              value={filters.action}
              onChange={e => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="">All Actions</option>
              {ALL_ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
            </select>
            <Input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
            <Input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
            <Button onClick={loadLogs} className="w-full">Apply</Button>
          </div>
        </div>
      </Card>

      <div className="text-sm text-gray-500">{filtered.length} records</div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">No audit logs found</Card>
        ) : filtered.map(log => (
          <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
            <div
              className="flex items-start justify-between gap-2 cursor-pointer"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor(log.action)}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{getDescription(log)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">
                  {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}
                </span>
                {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {expandedId === log.id && log.details && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-600 bg-gray-50 rounded p-3">
                <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(log.details, null, 2)}</pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
