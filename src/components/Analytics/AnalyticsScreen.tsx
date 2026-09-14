import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '../../types/food';
import { COLORS } from '../../theme/colors';

interface AnalyticsScreenProps {
  trendData: {
    date: string;
    label: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  profile: UserProfile;
  isDark: boolean;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  trendData,
  profile,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const [timeRange, setTimeRange] = useState<7 | 14>(7);

  const displayData = trendData.slice(-timeRange);

  const totalCalories = displayData.reduce((sum, d) => sum + d.calories, 0);
  const avgCalories = Math.round(totalCalories / (displayData.length || 1));
  const maxCalories = Math.max(...displayData.map((d) => d.calories), 1);
  const targetCalories = profile.targetCalories;

  const totalProtein = displayData.reduce((sum, d) => sum + d.protein, 0);
  const totalCarbs = displayData.reduce((sum, d) => sum + d.carbs, 0);
  const totalFat = displayData.reduce((sum, d) => sum + d.fat, 0);

  const proteinKcal = totalProtein * 4;
  const carbsKcal = totalCarbs * 4;
  const fatKcal = totalFat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;

  const proteinRatio = Math.round((proteinKcal / totalMacroKcal) * 100);
  const carbsRatio = Math.round((carbsKcal / totalMacroKcal) * 100);
  const fatRatio = Math.round((fatKcal / totalMacroKcal) * 100);

  const adherenceDays = displayData.filter(
    (d) => d.calories >= targetCalories * 0.85 && d.calories <= targetCalories * 1.15
  ).length;
  const adherenceRate = Math.round((adherenceDays / (displayData.length || 1)) * 100);

  const totalTargetPeriod = targetCalories * displayData.length;
  const netDeficitOrSurplus = totalCalories - totalTargetPeriod;
  const estimatedWeightChangeKg = Math.round((netDeficitOrSurplus / 7700) * 100) / 100;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header & Range Selector */}
      <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart" size={18} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Thống Kê & Xu Hướng</Text>
        </View>

        <View style={[styles.rangeSelector, { backgroundColor: theme.cardElevated }]}>
          <TouchableOpacity
            style={[
              styles.rangeBtn,
              timeRange === 7 && [styles.rangeBtnActive, { backgroundColor: theme.primaryBg }],
            ]}
            onPress={() => setTimeRange(7)}
          >
            <Text
              style={[
                styles.rangeBtnText,
                { color: timeRange === 7 ? theme.primary : theme.textSecondary },
                timeRange === 7 && { fontWeight: '800' },
              ]}
            >
              7 Ngày Qua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rangeBtn,
              timeRange === 14 && [styles.rangeBtnActive, { backgroundColor: theme.primaryBg }],
            ]}
            onPress={() => setTimeRange(14)}
          >
            <Text
              style={[
                styles.rangeBtnText,
                { color: timeRange === 14 ? theme.primary : theme.textSecondary },
                timeRange === 14 && { fontWeight: '800' },
              ]}
            >
              14 Ngày Qua
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Stat Cards Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.statCardTop}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TB Calo / ngày</Text>
            <MaterialCommunityIcons name="fire" size={14} color="#f59e0b" />
          </View>
          <Text style={[styles.statVal, { color: theme.text }]}>{avgCalories.toLocaleString()}</Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>Mục tiêu: {targetCalories}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.statCardTop}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Kiên trì mục tiêu</Text>
            <Ionicons name="checkmark-circle" size={14} color={theme.primary} />
          </View>
          <Text style={[styles.statVal, { color: theme.primary }]}>{adherenceRate}%</Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>
            {adherenceDays}/{displayData.length} ngày đạt
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.statCardTop}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Cân bằng calo</Text>
            <Ionicons
              name={netDeficitOrSurplus <= 0 ? 'trending-down' : 'trending-up'}
              size={14}
              color={netDeficitOrSurplus <= 0 ? theme.primary : '#f59e0b'}
            />
          </View>
          <Text
            style={[
              styles.statVal,
              { color: netDeficitOrSurplus <= 0 ? theme.primary : '#f59e0b' },
            ]}
          >
            {netDeficitOrSurplus <= 0 ? `${netDeficitOrSurplus}` : `+${netDeficitOrSurplus}`}
            <Text style={{ fontSize: 10, fontWeight: 'normal' }}> kcal</Text>
          </Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>
            {netDeficitOrSurplus <= 0 ? 'Thâm hụt tốt' : 'Thặng dư năng lượng'}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.statCardTop}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Dự tính mỡ</Text>
            <MaterialCommunityIcons name="trophy-outline" size={14} color={theme.protein} />
          </View>
          <Text style={[styles.statVal, { color: theme.protein }]}>
            {estimatedWeightChangeKg > 0 ? `+${estimatedWeightChangeKg}` : estimatedWeightChangeKg} kg
          </Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>Chuẩn 7700 kcal</Text>
        </View>
      </View>

      {/* 7-Day Bar Chart */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Biểu Đồ Nạp Calo Hàng Ngày</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Mục tiêu {targetCalories}k
            </Text>
          </View>
        </View>

        {/* Custom Native Bar Chart */}
        <View style={styles.barsArea}>
          <View style={[styles.barsWrapper, { borderBottomColor: theme.cardBorder }]}>
            {displayData.map((d, i) => {
              const maxScale = Math.max(maxCalories, targetCalories * 1.25);
              const heightPct = Math.min(100, Math.max(6, Math.round((d.calories / maxScale) * 100)));
              const isOver = d.calories > targetCalories;

              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barCaloLabel, { color: theme.textMuted }]}>
                    {d.calories > 0 ? d.calories : '-'}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: isOver ? '#f59e0b' : theme.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDateLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Macro Ratio Stacked Bar */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Tỉ Lệ Phân Bổ Năng Lượng Thực Tế (Macros)
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Trung bình trong {displayData.length} ngày đã chọn
        </Text>

        {/* Stacked Bar */}
        <View style={styles.stackedBar}>
          <View style={[styles.stackProtein, { width: `${proteinRatio}%`, backgroundColor: theme.protein }]} />
          <View style={[styles.stackCarbs, { width: `${carbsRatio}%`, backgroundColor: theme.carbs }]} />
          <View style={[styles.stackFat, { width: `${fatRatio}%`, backgroundColor: theme.fat }]} />
        </View>

        {/* Macro Details */}
        <View style={styles.macroLegRow}>
          <View style={[styles.macroLegBox, { backgroundColor: theme.cardElevated, borderColor: theme.proteinBorder }]}>
            <Text style={[styles.macroLegName, { color: theme.protein }]}>Đạm (Protein)</Text>
            <Text style={[styles.macroLegVal, { color: theme.text }]}>
              {proteinRatio}% <Text style={{ fontSize: 10, color: theme.textMuted }}>({Math.round(totalProtein)}g)</Text>
            </Text>
          </View>

          <View style={[styles.macroLegBox, { backgroundColor: theme.cardElevated, borderColor: theme.carbsBorder }]}>
            <Text style={[styles.macroLegName, { color: theme.carbs }]}>Tinh bột (Carbs)</Text>
            <Text style={[styles.macroLegVal, { color: theme.text }]}>
              {carbsRatio}% <Text style={{ fontSize: 10, color: theme.textMuted }}>({Math.round(totalCarbs)}g)</Text>
            </Text>
          </View>

          <View style={[styles.macroLegBox, { backgroundColor: theme.cardElevated, borderColor: theme.fatBorder }]}>
            <Text style={[styles.macroLegName, { color: theme.fat }]}>Chất béo (Fat)</Text>
            <Text style={[styles.macroLegVal, { color: theme.text }]}>
              {fatRatio}% <Text style={{ fontSize: 10, color: theme.textMuted }}>({Math.round(totalFat)}g)</Text>
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  rangeSelector: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
  },
  rangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  rangeBtnActive: {},
  rangeBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 10,
    marginTop: -4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
  },
  barsArea: {
    marginTop: 10,
  },
  barsWrapper: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 3,
  },
  barCaloLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  barTrack: {
    width: 20,
    height: 90,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barDateLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  stackedBar: {
    height: 14,
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 6,
  },
  stackProtein: {
    height: '100%',
  },
  stackCarbs: {
    height: '100%',
  },
  stackFat: {
    height: '100%',
  },
  macroLegRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  macroLegBox: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  macroLegName: {
    fontSize: 10,
    fontWeight: '700',
  },
  macroLegVal: {
    fontSize: 12,
    fontWeight: '800',
  },
});
