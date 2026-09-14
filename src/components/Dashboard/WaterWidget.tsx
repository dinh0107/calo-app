import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import {
  waterReminderService,
  generateWaterSchedule,
  getNextWaterSlot,
} from '../../services/waterReminderService';
import type { WaterScheduleItem } from '../../types/water';

interface WaterWidgetProps {
  currentWater: number;
  waterGoal: number;
  onAddWater: (amount: number) => void;
  onResetWater: () => void;
  onOpenReminder?: () => void;
  isDark: boolean;
}

export const WaterWidget: React.FC<WaterWidgetProps> = ({
  currentWater,
  waterGoal,
  onAddWater,
  onResetWater,
  onOpenReminder,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const percent = Math.min(Math.round((currentWater / (waterGoal || 2000)) * 100), 100);
  const remaining = Math.max(0, waterGoal - currentWater);

  const [nextSlot, setNextSlot] = useState<WaterScheduleItem | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    waterReminderService.init().then((cfg) => {
      setReminderEnabled(cfg.enabled);
      if (cfg.enabled) {
        const schedule = generateWaterSchedule(cfg.startTime, cfg.endTime, cfg.dailyGoal || waterGoal, cfg.cupSize);
        const next = getNextWaterSlot(schedule);
        setNextSlot(next);
      } else {
        setNextSlot(null);
      }
    });
  }, [waterGoal]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: theme.waterBg,
                borderColor: theme.waterBorder,
              },
            ]}
          >
            <Ionicons name="water" size={18} color={theme.water} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Uống Nước Hôm Nay</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Mục tiêu: {waterGoal.toLocaleString()} ml
            </Text>
          </View>
        </View>

        <View style={styles.valCol}>
          <Text style={[styles.currentVal, { color: theme.water }]}>
            {currentWater.toLocaleString()}
            <Text style={[styles.unit, { color: theme.textSecondary }]}> / {waterGoal} ml</Text>
          </Text>
        </View>
      </View>

      {/* Next Upcoming Reminder Pill */}
      {reminderEnabled && nextSlot && (
        <TouchableOpacity
          style={[styles.nextSlotPill, { backgroundColor: theme.waterBg, borderColor: theme.waterBorder }]}
          onPress={onOpenReminder}
          activeOpacity={0.7}
        >
          <Ionicons name="alarm-outline" size={14} color={theme.water} />
          <Text style={[styles.nextSlotText, { color: theme.text }]}>
            Lần uống tiếp: <Text style={{ fontWeight: '800', color: theme.water }}>{nextSlot.time}</Text> ({nextSlot.amountMl}ml)
          </Text>
          <View style={[styles.reminderTag, { backgroundColor: isDark ? 'rgba(2,132,199,0.25)' : 'rgba(2,132,199,0.15)' }]}>
            <Ionicons name="notifications" size={10} color={theme.water} />
            <Text style={[styles.reminderTagText, { color: theme.water }]}>Lịch nhắc</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Progress Bar */}
      <View
        style={[
          styles.track,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
        ]}
      >
        <View
          style={[
            styles.fill,
            { width: `${percent}%`, backgroundColor: theme.water },
          ]}
        />
      </View>

      <View style={styles.progressSubRow}>
        <Text style={[styles.percentLabel, { color: theme.textSecondary }]}>
          {percent}% mục tiêu
        </Text>
        <Text
          style={[
            styles.remainingLabel,
            { color: remaining === 0 ? theme.primary : theme.textMuted },
          ]}
        >
          {remaining === 0 ? 'Đã đạt chỉ tiêu ngày' : `Còn thiếu ${remaining.toLocaleString()} ml`}
        </Text>
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.quickBtn,
            {
              backgroundColor: theme.waterBg,
              borderColor: theme.waterBorder,
            },
          ]}
          onPress={() => onAddWater(250)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color={theme.water} />
          <Text style={[styles.quickBtnText, { color: theme.water }]}>+250 ml (Ly)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickBtn,
            {
              backgroundColor: theme.waterBg,
              borderColor: theme.waterBorder,
            },
          ]}
          onPress={() => onAddWater(500)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color={theme.water} />
          <Text style={[styles.quickBtnText, { color: theme.water }]}>+500 ml (Chai)</Text>
        </TouchableOpacity>

        {currentWater > 0 && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.cardElevated,
                borderColor: theme.cardBorderStrong || theme.cardBorder,
              },
            ]}
            onPress={onResetWater}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
      } as any,
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  reminderBellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  reminderBellText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  valCol: {
    alignItems: 'flex-end',
  },
  currentVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  unit: {
    fontSize: 11,
    fontWeight: 'normal',
  },
  nextSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 2,
  },
  nextSlotText: {
    fontSize: 11,
    flex: 1,
  },
  reminderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reminderTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  track: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 3.5,
  },
  progressSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  percentLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
