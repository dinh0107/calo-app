import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { WaterReminderConfig, WaterScheduleItem } from '../types/water';

const STORAGE_KEY_CONFIG = 'calovision_water_reminder_config_v1';

// Set up native notification display handler for iOS / Android
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const DEFAULT_WATER_CONFIG: WaterReminderConfig = {
  enabled: true,
  startTime: '07:00',
  endTime: '21:30',
  dailyGoal: 2000,
  cupSize: 250,
  soundEnabled: true,
};

const SCHEDULE_ADVICES = [
  'Đánh thức cơ thể & thanh lọc hệ tiêu hóa ngay khi thức dậy.',
  'Tăng cường tuần hoàn máu & duy trì sự tập trung cho não bộ.',
  'Uống trước bữa ăn 30 phút giúp hỗ trợ enzym tiêu hóa.',
  'Cấp nước sau giờ nghỉ trưa, xua tan cảm giác uể oải.',
  'Duy trì trao đổi chất & tái nạp năng lượng làm việc buổi chiều.',
  'Cân bằng điện giải sau giờ làm việc hoặc chuẩn bị vận động.',
  'Giúp cơ thể hấp thu dưỡng chất tốt hơn sau bữa ăn tối.',
  'Ly nước ấm nhỏ trước khi ngủ giúp ngăn ngừa thiếu nước về đêm.',
  'Bổ sung lượng nước hao hụt trong ngày, giúp da dẻ mịn màng.',
  'Thanh lọc cơ thể và duy trì năng lượng dồi dào suốt ngày dài.',
];

/**
 * Convert "HH:mm" to total minutes from 00:00
 */
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => Number(v) || 0);
  return h * 60 + m;
}

/**
 * Convert total minutes to "HH:mm"
 */
function formatMinutesToTime(totalMin: number): string {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate intelligent water drinking schedule
 */
export function generateWaterSchedule(
  startTimeStr: string = '07:00',
  endTimeStr: string = '21:30',
  dailyGoal: number = 2000,
  cupSize: number = 250
): WaterScheduleItem[] {
  const goal = Math.max(500, dailyGoal || 2000);
  const size = Math.max(100, cupSize || 250);
  const totalGlasses = Math.max(2, Math.round(goal / size));

  const startMin = parseTimeToMinutes(startTimeStr || '07:00');
  let endMin = parseTimeToMinutes(endTimeStr || '21:30');

  if (endMin <= startMin) {
    endMin += 1440; // Next day wrap
  }

  const totalDuration = endMin - startMin;
  const interval = totalDuration / (totalGlasses - 1 || 1);

  const items: WaterScheduleItem[] = [];

  for (let i = 0; i < totalGlasses; i++) {
    const currentMin = Math.round(startMin + i * interval);
    const timeFormatted = formatMinutesToTime(currentMin);
    const advice = SCHEDULE_ADVICES[i % SCHEDULE_ADVICES.length];

    let title = `Ly ${i + 1} (${size}ml)`;
    if (i === 0) title = `Ly 1 - Chào ngày mới (${size}ml)`;
    else if (i === totalGlasses - 1) title = `Ly ${i + 1} - Trước khi ngủ (${size}ml)`;
    else if (i === Math.floor(totalGlasses / 2)) title = `Ly ${i + 1} - Nạp năng lượng trưa (${size}ml)`;

    items.push({
      id: `water_slot_${i + 1}_${timeFormatted.replace(':', '')}`,
      time: timeFormatted,
      amountMl: size,
      title,
      advice,
    });
  }

  return items;
}

/**
 * Find the next upcoming water reminder slot from current time
 */
export function getNextWaterSlot(
  schedule: WaterScheduleItem[],
  currentTimeStr?: string
): WaterScheduleItem | null {
  if (!schedule || schedule.length === 0) return null;

  const now = new Date();
  const currentMinutes = currentTimeStr
    ? parseTimeToMinutes(currentTimeStr)
    : now.getHours() * 60 + now.getMinutes();

  for (const item of schedule) {
    const itemMin = parseTimeToMinutes(item.time);
    if (itemMin >= currentMinutes) {
      return item;
    }
  }

  // If passed all slots today, next slot is tomorrow's first slot
  return schedule[0] || null;
}

/**
 * Play gentle notification chime sound using Web Audio API
 */
export function playNotificationChime(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Pleasant two-tone chime (E5 -> G5)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(329.63, now); // E4 harmony

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('AudioContext chime error:', e);
  }
}

/**
 * Storage & Notification Management
 */
let cachedConfig: WaterReminderConfig = DEFAULT_WATER_CONFIG;
let lastTriggeredSlotId: string | null = null;
let lastTriggeredMinute: string | null = null;

type NotificationListener = (title: string, body: string, amountMl?: number) => void;
const toastListeners: Set<NotificationListener> = new Set();

export const waterReminderService = {
  async init(): Promise<WaterReminderConfig> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        cachedConfig = { ...DEFAULT_WATER_CONFIG, ...JSON.parse(stored) };
      } else {
        cachedConfig = { ...DEFAULT_WATER_CONFIG };
      }
    } catch {
      cachedConfig = { ...DEFAULT_WATER_CONFIG };
    }
    return cachedConfig;
  },

  getConfig(): WaterReminderConfig {
    return cachedConfig;
  },

  async saveConfig(config: Partial<WaterReminderConfig>): Promise<WaterReminderConfig> {
    cachedConfig = { ...cachedConfig, ...config };
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cachedConfig));
    } catch (e) {
      console.warn('Failed to save water reminder config:', e);
    }
    return cachedConfig;
  },

  onToast(callback: NotificationListener): () => void {
    toastListeners.add(callback);
    return () => {
      toastListeners.delete(callback);
    };
  },

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
        return false;
      }
      return true;
    } else {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        return finalStatus === 'granted';
      } catch (e) {
        console.warn('Native notification permission error:', e);
        return true;
      }
    }
  },

  hasPermission(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return true;
  },

  async sendNotification(title: string, body: string, amountMl?: number): Promise<void> {
    if (cachedConfig.soundEnabled) {
      playNotificationChime();
    }

    // 1. Native Push / Local Notification (iOS & Android)
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: cachedConfig.soundEnabled,
          },
          trigger: null, // trigger immediately
        });
      } catch (e) {
        console.warn('Native notification trigger error:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      // 2. Web Browser Notification
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💧</text></svg>',
          });
        } catch (e) {
          console.warn('Web notification error:', e);
        }
      }
    }

    // 3. In-App Interactive Toast Banner
    toastListeners.forEach((listener) => {
      try {
        listener(title, body, amountMl || cachedConfig.cupSize);
      } catch (e) {
        console.warn('Toast listener error:', e);
      }
    });
  },

  async checkAndTriggerReminder(): Promise<WaterScheduleItem | null> {
    if (!cachedConfig.enabled) return null;

    const now = new Date();
    const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayDateStr = now.toISOString().split('T')[0];
    const minuteKey = `${todayDateStr}_${currentHHmm}`;

    if (lastTriggeredMinute === minuteKey) {
      return null; // Already triggered this minute
    }

    const schedule = generateWaterSchedule(
      cachedConfig.startTime,
      cachedConfig.endTime,
      cachedConfig.dailyGoal,
      cachedConfig.cupSize
    );

    const matchingSlot = schedule.find((item) => item.time === currentHHmm);
    if (matchingSlot && lastTriggeredSlotId !== `${minuteKey}_${matchingSlot.id}`) {
      lastTriggeredMinute = minuteKey;
      lastTriggeredSlotId = `${minuteKey}_${matchingSlot.id}`;

      await this.sendNotification(
        `💧 Giờ uống nước (${matchingSlot.amountMl}ml)`,
        `${matchingSlot.title}: ${matchingSlot.advice}`,
        matchingSlot.amountMl
      );
      return matchingSlot;
    }

    return null;
  },
};
