import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Calendar, Newspaper } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

interface NewsFormData {
  id?: number;
  title: string;
  content: string;
  type: 'NEWS' | 'EVENT' | 'ANNOUNCEMENT';
  publishDate: string;
  priority: number;
  imageUrl?: string;
}

export const NewsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsFormData | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: '',
    content: '',
    type: 'NEWS',
    publishDate: new Date().toISOString().split('T')[0],
    priority: 1,
    imageUrl: '',
  });

  const { data: newsEvents, isLoading } = useQuery({
    queryKey: ['news-events'],
    queryFn: () => apiService.getNewsEvents(),
  });

  const createMutation = useMutation({
    mutationFn: (data: NewsFormData) => apiService.createNewsEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-events'] });
      toast.success('News/Event created successfully');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to create news/event'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: NewsFormData) => apiService.updateNewsEvent(data.id!.toString(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-events'] });
      toast.success('News/Event updated successfully');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update news/event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteNewsEvent(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-events'] });
      toast.success('News/Event deleted successfully');
    },
    onError: () => toast.error('Failed to delete news/event'),
  });

  const handleCreate = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      content: '',
      type: 'NEWS',
      publishDate: new Date().toISOString().split('T')[0],
      priority: 1,
      imageUrl: '',
    });
    setShowModal(true);
  };

  const handleEdit = (news: any) => {
    setEditingNews(news);
    setFormData({
      id: news.id,
      title: news.title,
      content: news.content,
      type: news.type,
      publishDate: news.publish_date || news.publishDate,
      priority: news.priority,
      imageUrl: news.imageUrl || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNews(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNews) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this news/event?')) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NEWS':
        return 'bg-blue-100 text-blue-800';
      case 'EVENT':
        return 'bg-green-100 text-green-800';
      case 'ANNOUNCEMENT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading news & events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('navigation.news')}</h1>
        {canCreate('news') && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create News/Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(newsEvents?.DDMS_data || [])?.map((news: any) => (
          <Card key={news.id}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(news.type)}`}>
                  {news.type}
                </span>
                <div className="flex space-x-1">
                  {canUpdate('news') && (
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(news)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete('news') && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(news.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
              
              {news.imageUrl && (
                <img
                  src={news.imageUrl}
                  alt={news.title}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="w-4 h-4 text-secondary-400" />
                <h3 className="text-lg font-semibold">{news.title}</h3>
              </div>
              
              <p className="text-sm text-secondary-600 mb-4 line-clamp-3">
                {news.content}
              </p>
              
              <div className="flex items-center justify-between text-xs text-secondary-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(news.publishDate).toLocaleDateString()}
                </div>
                <span className={`px-2 py-1 rounded-full ${
                  news.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {news.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(!newsEvents?.DDMS_data || newsEvents?.DDMS_data?.length === 0) && (
        <Card>
          <div className="p-12 text-center text-secondary-500">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-secondary-300" />
            <p>No news or events found</p>
            <Button onClick={handleCreate} className="mt-4">
              Create First News/Event
            </Button>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingNews ? 'Edit News/Event' : 'Create News/Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div>
            <label className="form-label">Content *</label>
            <textarea
              className="input min-h-[120px]"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
            />
          </div>
          <Select
            label="Type *"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            required
          >
            <option value="NEWS">News</option>
            <option value="EVENT">Event</option>
            <option value="ANNOUNCEMENT">Announcement</option>
          </Select>
          <Input
            label="Publish Date *"
            type="date"
            value={formData.publishDate}
            onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
            required
          />
          <Input
            label="Priority (1-10)"
            type="number"
            min="1"
            max="10"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
          />
          <Input
            label="Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
