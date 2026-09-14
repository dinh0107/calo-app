import { api } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: 'water' | 'meal' | 'promo' | 'info' | 'warning';
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const LAST_SEEN_NOTIF_KEY = 'calovision_last_seen_notif_id';
type NotificationCallback = (notification: AppNotification) => void;

let listeners: NotificationCallback[] = [];
let pollerInterval: any = null;

export const notificationService = {
  subscribe(callback: NotificationCallback): () => void {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter((cb) => cb !== callback);
    };
  },

  async fetchNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const res = await api.notifications.getAll();
    if (res.success && res.data) {
      return res.data;
    }
    return { notifications: [], unreadCount: 0 };
  },

  async checkForNewNotifications(): Promise<void> {
    try {
      const res = await api.notifications.getAll();
      if (!res.success || !res.data?.notifications?.length) return;

      const latest = res.data.notifications[0] as AppNotification;
      const lastSeenId = await AsyncStorage.getItem(LAST_SEEN_NOTIF_KEY);

      if (latest && latest.id !== lastSeenId) {
        await AsyncStorage.setItem(LAST_SEEN_NOTIF_KEY, latest.id);
        // Dispatch to all subscribers
        listeners.forEach((cb) => cb(latest));
      }
    } catch {
      // Ignore network errors in poller
    }
  },

  startPolling(intervalMs: number = 10000): void {
    if (pollerInterval) return;
    this.checkForNewNotifications();
    pollerInterval = setInterval(() => {
      this.checkForNewNotifications();
    }, intervalMs);
  },

  stopPolling(): void {
    if (pollerInterval) {
      clearInterval(pollerInterval);
      pollerInterval = null;
    }
  },

  async markAsRead(id: string): Promise<void> {
    await api.notifications.markRead(id);
  },

  async markAllAsRead(): Promise<void> {
    await api.notifications.markAllRead();
  },
};
