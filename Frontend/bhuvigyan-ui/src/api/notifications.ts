import api from './axios';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const getNotifications = async (unreadOnly = false, limit = 50, offset = 0): Promise<{ items: Notification[]; total: number }> => {
  const res = await api.get('/notifications', { params: { unreadOnly, limit, offset } });
  return res.data.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const res = await api.get('/notifications/unread-count');
  return res.data.data.count;
};

export const markRead = async (notifId: string) => {
  const res = await api.put(`/notifications/${notifId}/read`);
  return res.data;
};

export const markAllRead = async () => {
  const res = await api.put('/notifications/mark-all-read');
  return res.data;
};
