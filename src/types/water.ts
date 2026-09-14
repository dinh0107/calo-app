export interface WaterScheduleItem {
  id: string;
  time: string; // "07:00", "09:00", etc.
  amountMl: number; // 250
  title: string; // "Ly 1 - Khởi động ngày mới"
  advice: string; // "Uống ngay khi thức dậy giúp đánh thức các cơ quan..."
  isCompleted?: boolean;
}

export interface WaterReminderConfig {
  enabled: boolean;
  startTime: string; // "07:00"
  endTime: string; // "21:30"
  dailyGoal: number; // 2000
  cupSize: number; // 250
  soundEnabled: boolean;
  lastNotifiedTime?: string;
}
