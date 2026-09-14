import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import type { WaterReminderConfig, WaterScheduleItem } from '../../types/water';
import {
  generateWaterSchedule,
  waterReminderService,
  playNotificationChime,
  DEFAULT_WATER_CONFIG,
} from '../../services/waterReminderService';

interface WaterReminderModalProps {
  visible: boolean;
  onClose: () => void;
  waterGoal?: number;
  onConfigSaved?: (config: WaterReminderConfig) => void;
  isDark: boolean;
}

const START_TIME_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30'];
const END_TIME_PRESETS = ['21:00', '21:30', '22:00', '22:30'];
const CUP_SIZE_OPTIONS = [
  { label: '200 ml', val: 200 },
  { label: '250 ml (Chuẩn)', val: 250 },
  { label: '300 ml', val: 300 },
  { label: '500 ml (Chai)', val: 500 },
];

export const WaterReminderModal: React.FC<WaterReminderModalProps> = ({
  visible,
  onClose,
  waterGoal = 2000,
  onConfigSaved,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [config, setConfig] = useState<WaterReminderConfig>(() => ({
    ...DEFAULT_WATER_CONFIG,
    dailyGoal: waterGoal || 2000,
  }));

  const [schedule, setSchedule] = useState<WaterScheduleItem[]>([]);
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      waterReminderService.init().then((saved) => {
        const active = {
          ...saved,
          dailyGoal: waterGoal || saved.dailyGoal || 2000,
        };
        setConfig(active);
        updateSchedule(active.startTime, active.endTime, active.dailyGoal, active.cupSize);
      });
    }
  }, [visible, waterGoal]);

  const updateSchedule = (start: string, end: string, goal: number, cup: number) => {
    const list = generateWaterSchedule(start, end, goal, cup);
    setSchedule(list);
  };

  const handleStartTimeChange = (newStart: string) => {
    const next = { ...config, startTime: newStart };
    setConfig(next);
    updateSchedule(next.startTime, next.endTime, next.dailyGoal, next.cupSize);
  };

  const handleEndTimeChange = (newEnd: string) => {
    const next = { ...config, endTime: newEnd };
    setConfig(next);
    updateSchedule(next.startTime, next.endTime, next.dailyGoal, next.cupSize);
  };

  const handleCupSizeChange = (size: number) => {
    const next = { ...config, cupSize: size };
    setConfig(next);
    updateSchedule(next.startTime, next.endTime, next.dailyGoal, next.cupSize);
  };

  const handleTestNotification = async () => {
    // Request permission if not granted
    const hasPerm = await waterReminderService.requestPermission();
    if (!hasPerm) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Vui lòng bật quyền Thông báo (Notification) trên thanh địa chỉ trình duyệt để nhận nhắc nhở uống nước.');
      } else {
        Alert.alert('Cấp quyền thông báo', 'Vui lòng cho phép ứng dụng gửi thông báo trên thiết bị.');
      }
      return;
    }

    await waterReminderService.sendNotification(
      'CaloVision - Đã đến giờ uống nước! 💧',
      `Đã đến mốc uống nước: Hãy uống 1 ly nước ${config.cupSize}ml để thanh lọc cơ thể và giữ năng lượng tươi mới nhé!`,
      config.cupSize
    );

    setTestNotifSuccess(true);
    setTimeout(() => setTestNotifSuccess(false), 3000);
  };

  const handleSave = async () => {
    if (config.enabled) {
      await waterReminderService.requestPermission();
    }
    const saved = await waterReminderService.saveConfig(config);
    onConfigSaved?.(saved);
    onClose();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Đã lưu lịch trình nhắc nhở uống nước tự động thành công!');
    } else {
      Alert.alert('Thành công', 'Đã lưu lịch trình nhắc nhở uống nước tự động!');
    }
  };

  const totalGlasses = schedule.length;
  const intervalHours = (
    (schedule.length > 1
      ? (Number(config.endTime.split(':')[0]) * 60 +
          Number(config.endTime.split(':')[1]) -
          (Number(config.startTime.split(':')[0]) * 60 + Number(config.startTime.split(':')[1]))) /
        (schedule.length - 1) /
        60
      : 2)
  ).toFixed(1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.waterBg, borderColor: theme.waterBorder }]}>
                <Ionicons name="water" size={20} color={theme.water} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Lịch Nhắc Uống Nước Tự Động</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Hệ thống tự chia đều {config.dailyGoal}ml nước trong ngày
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Toggle Enable Reminder Switch */}
            <View style={[styles.switchCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.switchTitle, { color: theme.text }]}>Bật Nhắc Nhở Uống Nước</Text>
                <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>
                  Tự động gửi thông báo theo từng mốc giờ khoa học
                </Text>
              </View>
              <Switch
                value={config.enabled}
                onValueChange={(val) => setConfig({ ...config, enabled: val })}
                trackColor={{ false: theme.cardBorder, true: theme.water }}
                thumbColor="#ffffff"
              />
            </View>

            {/* 1. Start Time Picker */}
            <View style={[styles.sectionCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sunny-outline" size={16} color={theme.water} />
                <Text style={[styles.sectionHeading, { color: theme.text }]}>
                  Thời gian bắt đầu ngày mới (Giờ thức dậy):
                </Text>
              </View>

              {/* Start Time Presets */}
              <View style={styles.timeChipsRow}>
                {START_TIME_PRESETS.map((t) => {
                  const isSelected = config.startTime === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.timeChip,
                        isSelected
                          ? { backgroundColor: theme.waterBg, borderColor: theme.water }
                          : { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                      onPress={() => handleStartTimeChange(t)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          { color: isSelected ? theme.water : theme.textSecondary },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Start Time Input */}
              <View style={styles.customTimeRow}>
                <Text style={[styles.customTimeLabel, { color: theme.textSecondary }]}>Hoặc nhập giờ:</Text>
                <TextInput
                  style={[
                    styles.customTimeInput,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text },
                  ]}
                  value={config.startTime}
                  onChangeText={handleStartTimeChange}
                  placeholder="HH:mm (VD: 07:00)"
                  placeholderTextColor={theme.textMuted}
                  maxLength={5}
                />
              </View>
            </View>

            {/* 2. End Time & Cup Size */}
            <View style={[styles.sectionCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="moon-outline" size={16} color={theme.water} />
                <Text style={[styles.sectionHeading, { color: theme.text }]}>
                  Thời gian kết thúc (Giờ nghỉ ngơi):
                </Text>
              </View>

              <View style={styles.timeChipsRow}>
                {END_TIME_PRESETS.map((t) => {
                  const isSelected = config.endTime === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.timeChip,
                        isSelected
                          ? { backgroundColor: theme.waterBg, borderColor: theme.water }
                          : { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                      onPress={() => handleEndTimeChange(t)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          { color: isSelected ? theme.water : theme.textSecondary },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cup Size Options */}
              <View style={{ marginTop: 10, gap: 8 }}>
                <Text style={[styles.sectionHeading, { color: theme.text }]}>Dung tích mỗi ly nước:</Text>
                <View style={styles.cupOptionsRow}>
                  {CUP_SIZE_OPTIONS.map((c) => {
                    const isSelected = config.cupSize === c.val;
                    return (
                      <TouchableOpacity
                        key={c.val}
                        style={[
                          styles.cupChip,
                          isSelected
                            ? { backgroundColor: theme.waterBg, borderColor: theme.water }
                            : { backgroundColor: theme.card, borderColor: theme.cardBorder },
                        ]}
                        onPress={() => handleCupSizeChange(c.val)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.cupChipText,
                            { color: isSelected ? theme.water : theme.textSecondary },
                            isSelected && { fontWeight: '800' },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 3. Automatic Calculation Summary Badge */}
            <View style={[styles.summaryBanner, { backgroundColor: theme.waterBg, borderColor: theme.waterBorder }]}>
              <Ionicons name="sparkles" size={18} color={theme.water} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.summaryTitle, { color: theme.water }]}>
                  Lịch trình tính toán: {totalGlasses} ly nước • {config.dailyGoal} ml
                </Text>
                <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
                  Nhắc nhở tự động mỗi ~{intervalHours} tiếng từ {config.startTime} đến {config.endTime}.
                </Text>
              </View>
            </View>

            {/* 4. Full Day Timeline Preview */}
            <View style={styles.timelineSection}>
              <Text style={[styles.timelineHeaderTitle, { color: theme.text }]}>
                Chi tiết {totalGlasses} mốc uống nước trong ngày:
              </Text>
              <View style={styles.timelineList}>
                {schedule.map((item, idx) => (
                  <View key={item.id} style={[styles.timelineItem, { borderLeftColor: theme.waterBorder }]}>
                    <View style={[styles.timelineDot, { backgroundColor: theme.water }]} />
                    <View style={[styles.timelineBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                      <View style={styles.timelineBoxTop}>
                        <Text style={[styles.timelineTimeBadge, { color: theme.water }]}>{item.time}</Text>
                        <Text style={[styles.timelineItemTitle, { color: theme.text }]}>{item.title}</Text>
                      </View>
                      <Text style={[styles.timelineAdvice, { color: theme.textSecondary }]}>{item.advice}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 5. Notification Sound Toggle & Test Button */}
            <View style={[styles.notifActionRow, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="volume-high-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.soundToggleText, { color: theme.text }]}>Âm thanh chuông báo</Text>
              </View>
              <Switch
                value={config.soundEnabled}
                onValueChange={(val) => setConfig({ ...config, soundEnabled: val })}
                trackColor={{ false: theme.cardBorder, true: theme.water }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity
              style={[styles.testBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={handleTestNotification}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={16} color={theme.water} />
              <Text style={[styles.testBtnText, { color: theme.water }]}>
                {testNotifSuccess ? '✓ Đã gửi thông báo thử thành công!' : 'Thử Nghiệm Thông Báo Ngay'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={[styles.modalFooter, { borderTopColor: theme.cardBorder }]}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.water }]} onPress={handleSave} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.saveBtnText}>Lưu & Kích Hoạt Lịch Trình</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 24,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  switchDesc: {
    fontSize: 11,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  customTimeLabel: {
    fontSize: 12,
  },
  customTimeInput: {
    width: 120,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cupOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cupChip: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cupChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 11,
    lineHeight: 16,
  },
  timelineSection: {
    gap: 10,
  },
  timelineHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  timelineList: {
    paddingLeft: 12,
    gap: 10,
  },
  timelineItem: {
    borderLeftWidth: 2,
    paddingLeft: 14,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -6,
    top: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  timelineBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineTimeBadge: {
    fontSize: 12,
    fontWeight: '900',
  },
  timelineItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  timelineAdvice: {
    fontSize: 11,
    lineHeight: 16,
  },
  notifActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  soundToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
