import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'calovision_jwt_token_v1';

// Base API URL configuration
const API_BASE_URL = Platform.select({
  ios: 'http://127.0.0.1:5001/api',
  android: 'http://10.0.2.2:5001/api',
  default: 'http://localhost:5001/api',
});

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    console.warn(`API Error [${endpoint}]:`, error.message);
    return {
      success: false,
      message: error.message || 'Không thể kết nối đến máy chủ Backend.',
    };
  }
}

export const api = {
  // Authentication & Profile
  auth: {
    async register(name: string, email: string, password: string) {
      const res = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      if (res.success && res.data?.token) {
        await setAuthToken(res.data.token);
      }
      return res;
    },

    async login(email: string, password: string) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success && res.data?.token) {
        await setAuthToken(res.data.token);
      }
      return res;
    },

    async googleLogin(googleData: { email: string; name: string; avatarUrl?: string; googleId?: string }) {
      const res = await request('/auth/google', {
        method: 'POST',
        body: JSON.stringify(googleData),
      });
      if (res.success && res.data?.token) {
        await setAuthToken(res.data.token);
      }
      return res;
    },

    async getMe() {
      return await request('/auth/me');
    },

    async updateProfile(profileData: Record<string, any>) {
      return await request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    },

    async logout() {
      await setAuthToken(null);
    },
  },

  // Meals & Food Logging
  meals: {
    async getByDate(date: string) {
      return await request(`/meals?date=${date}`);
    },

    async add(mealData: { mealType: string; date: string; time: string; food: any }) {
      return await request('/meals', {
        method: 'POST',
        body: JSON.stringify(mealData),
      });
    },

    async delete(id: string) {
      return await request(`/meals/${id}`, {
        method: 'DELETE',
      });
    },

    async duplicate(id: string, targetDate: string) {
      return await request(`/meals/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ targetDate }),
      });
    },

    async clearAll() {
      return await request('/meals/all', {
        method: 'DELETE',
      });
    },
  },

  // AI Vision Food Analysis Proxy
  vision: {
    async analyze(imageBase64: string, mimeType: string = 'image/jpeg', notes?: string) {
      return await request('/vision/analyze', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mimeType, notes }),
      });
    },
  },

  // Water Tracker & Reminder Sync
  water: {
    async getLog(date: string) {
      return await request(`/water/log?date=${date}`);
    },

    async log(amountMl: number, date?: string) {
      return await request('/water/log', {
        method: 'POST',
        body: JSON.stringify({ amountMl, date }),
      });
    },

    async reset(date?: string) {
      return await request('/water/reset', {
        method: 'POST',
        body: JSON.stringify({ date }),
      });
    },

    async getReminderConfig() {
      return await request('/water/reminder-config');
    },

    async updateReminderConfig(config: Record<string, any>) {
      return await request('/water/reminder-config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },
  },

  // Analytics & Trend Reports
  analytics: {
    async getTrends(days: number = 14) {
      return await request(`/analytics/trends?days=${days}`);
    },
  },

  // Notifications (Admin broadcast & Push notifications)
  notifications: {
    async getAll() {
      return await request('/notifications');
    },

    async markRead(id: string) {
      return await request(`/notifications/${id}/read`, { method: 'PUT' });
    },

    async markAllRead() {
      return await request('/notifications/read-all', { method: 'PUT' });
    },

    async registerPushToken(pushToken: string) {
      return await request('/notifications/register-push', {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      });
    },
  },
};
