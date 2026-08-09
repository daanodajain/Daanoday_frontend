import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiService.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marked as read');
    },
    onError: () => toast.error('Failed to mark notification as read'),
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: string, read: boolean) => {
    if (read) return 'bg-secondary-50';
    switch (type) {
      case 'ERROR':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'SUCCESS':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'WARNING':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      default:
        return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  const filteredNotifications = (notifications?.DDMS_data || [])?.filter((notif: any) => {
    if (filter === 'UNREAD') return !notif.read_status;
    if (filter === 'READ') return notif.read_status;
    return true;
  });

  const unreadCount = (notifications?.DDMS_data || [])?.filter((n: any) => !n.read_status).length || 0;

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.notifications')}</h1>
          <p className="text-sm text-secondary-600 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'ALL' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('ALL')}
          >
            All
          </Button>
          <Button
            variant={filter === 'UNREAD' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('UNREAD')}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'READ' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('READ')}
          >
            Read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications ({filteredNotifications?.length || 0})</CardTitle>
        </CardHeader>

        <div className="divide-y divide-secondary-200">
          {filteredNotifications?.length === 0 ? (
            <div className="p-8 text-center text-secondary-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-secondary-300" />
              <p>No notifications found</p>
            </div>
          ) : (
            filteredNotifications?.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-4 ${getNotificationBg(notification.type, notification.read_status)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className={`text-sm font-semibold ${!notification.read_status ? 'text-secondary-900' : 'text-secondary-600'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-secondary-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-secondary-500 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!notification.read_status && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markReadMutation.mutate(notification.id.toString())}
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
