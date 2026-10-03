import { api } from '@/lib/api';

export interface NotificationItem {
  id: string; title: string; body: string | null; category: string | null;
  link: string | null; read: boolean; createdAt: string;
}

export const notificationsService = {
  async list(): Promise<{ unread: number; items: NotificationItem[] }> {
    return api.get('/api/notifications');
  },
  async markRead(id: string): Promise<void> { await api.post(`/api/notifications/${id}/read`); },
  async markAllRead(): Promise<void> { await api.post('/api/notifications/read-all'); },
};