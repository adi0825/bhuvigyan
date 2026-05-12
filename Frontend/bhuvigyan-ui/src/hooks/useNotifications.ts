import { useState, useEffect } from 'react';
import { farmerApi } from '../api/farmer';
import type { Notification } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await farmerApi.getNotifications();
      const data = (response as any).data?.data || (response as any).data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id: string) => {
    const prev = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    try {
      await farmerApi.markRead(id);
    } catch {
      setNotifications(prev);
    }
  };

const markAllRead = async () => {
    const prev = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
    );
    try {
      await farmerApi.markAllRead();
    } catch {
      setNotifications(prev);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}