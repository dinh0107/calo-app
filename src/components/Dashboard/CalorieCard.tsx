import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

interface CalorieCardProps {
  consumed: number;
  target: number;
  isDark: boolean;
}

export const CalorieCard: React.FC<CalorieCardProps> = ({
  consumed,
  target,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const percentage = Math.min(Math.round((consumed / (target || 1)) * 100), 100);
  const remaining = Math.max(0, target - consumed);
  const isOver = consumed > target;
  const overAmount = consumed - target;

  const size = 132;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.amberBg }]}>
            <MaterialCommunityIcons name="fire" size={16} color="#f59e0b" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Năng Lượng</Text>
        </View>

        <View
          style={[
            styles.targetBadge,
            {
              backgroundColor: theme.cardElevated,
              borderColor: theme.cardBorderStrong || theme.cardBorder,
            },
          ]}
        >
          <Text style={[styles.targetLabel, { color: theme.textSecondary }]}>Mục tiêu: </Text>
          <Text style={[styles.targetValue, { color: theme.primary }]}>
            {target.toLocaleString()}
          </Text>
          <Text style={[styles.targetUnit, { color: theme.textSecondary }]}> kcal</Text>
        </View>
      </View>

      {/* SVG Ring & Info */}
      <View style={styles.bodyRow}>
        <View style={styles.ringWrapper}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={theme.primaryLight || '#10b981'} />
                <Stop offset="100%" stopColor={theme.primary || '#059669'} />
              </LinearGradient>
            </Defs>
            {/* Background Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Stroke */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#calorieGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>

          <View style={styles.centerTextContainer}>
            <Text style={[styles.consumedNumber, { color: theme.text }]}>
              {consumed.toLocaleString()}
            </Text>
            <Text style={[styles.consumedLabel, { color: theme.textSecondary }]}>
              kcal đã nạp
            </Text>
            <View
              style={[
                styles.percentBadge,
                {
                  backgroundColor: theme.primaryBg,
                  borderColor: theme.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.percentText, { color: theme.primary }]}>
                {percentage}%
              </Text>
            </View>
          </View>
        </View>

        {/* Right Info Box */}
        <View style={styles.rightStatsCol}>
          {/* Remaining */}
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.cardElevated,
                borderColor: theme.cardBorderStrong || theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>
              Còn lại hôm nay
            </Text>
            <View style={styles.statValRow}>
              <Text
                style={[
                  styles.statBoxValue,
                  { color: isOver ? theme.danger : theme.primary },
                ]}
              >
                {isOver ? `+${overAmount.toLocaleString()}` : remaining.toLocaleString()}
              </Text>
              <Text style={[styles.statBoxUnit, { color: theme.textMuted }]}>kcal</Text>
            </View>
            <Text style={[styles.statBoxHint, { color: theme.textMuted }]}>
              {isOver ? 'Vượt chỉ tiêu' : 'Năng lượng cho phép'}
            </Text>
          </View>

          {/* Adherence Assessment */}
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.cardElevated,
                borderColor: theme.cardBorderStrong || theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>
              Đánh giá khẩu phần
            </Text>
            <View style={styles.statusBadgeRow}>
              <Ionicons
                name={isOver ? 'alert-circle' : 'checkmark-circle'}
                size={15}
                color={isOver ? '#f59e0b' : theme.primary}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isOver ? '#d97706' : theme.primary },
                ]}
              >
                {isOver ? 'Thặng dư calo' : 'Kiểm soát tốt'}
              </Text>
            </View>
            <Text style={[styles.statBoxHint, { color: theme.textMuted }]}>
              {isOver ? 'Cân nhắc vận động thêm' : 'Đạt tiến độ mục tiêu'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
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
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  targetValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  targetUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringWrapper: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  consumedLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: -1,
  },
  percentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 3,
  },
  percentText: {
    fontSize: 9,
    fontWeight: '800',
  },
  rightStatsCol: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  statBox: {
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 2,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statBoxUnit: {
    fontSize: 10,
  },
  statBoxHint: {
    fontSize: 9,
    marginTop: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
