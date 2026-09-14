import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile, MealEntry, MealType, MacroNutrients } from '../../types/food';
import { CalorieCard } from './CalorieCard';
import { MacroCard } from './MacroCard';
import { WaterWidget } from './WaterWidget';
import { MealListSection } from './MealListSection';
import { COLORS } from '../../theme/colors';

interface DashboardScreenProps {
  profile: UserProfile;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dailyTotals: MacroNutrients;
  mealsByType: Record<MealType, { entries: MealEntry[]; totalCalories: number }>;
  currentWater: number;
  onAddWater: (amount: number) => void;
  onResetWater: () => void;
  onOpenScanner: (mealType?: MealType) => void;
  onOpenManualAdd: (mealType?: MealType) => void;
  onDeleteMeal: (id: string) => void;
  onViewMealDetail: (meal: MealEntry) => void;
  onOpenOnboarding?: () => void;
  onOpenWaterReminder?: () => void;
  isDark: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  selectedDate,
  setSelectedDate,
  dailyTotals,
  mealsByType,
  currentWater,
  onAddWater,
  onResetWater,
  onOpenScanner,
  onOpenManualAdd,
  onDeleteMeal,
  onViewMealDetail,
  onOpenOnboarding,
  onOpenWaterReminder,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Modern Date Switcher Strip */}
      <View
        style={[
          styles.dateStrip,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.dateArrowBtn,
            {
              backgroundColor: theme.cardElevated,
              borderColor: theme.cardBorderStrong || theme.cardBorder,
            },
          ]}
          onPress={() => changeDate(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={16} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.dateCenterCol}>
          <Text style={[styles.dateText, { color: theme.text }]}>
            {formattedDate} {isToday && '• Hôm nay'}
          </Text>
          <TouchableOpacity
            style={styles.goalRow}
            onPress={onOpenOnboarding}
            activeOpacity={0.7}
            disabled={!onOpenOnboarding}
          >
            <Ionicons
              name={
                profile.goal === 'lose_weight' || profile.goal === 'lose_weight_fast'
                  ? 'trending-down'
                  : profile.goal === 'gain_muscle' || profile.goal === 'gain_weight'
                  ? 'trending-up'
                  : 'fitness'
              }
              size={12}
              color={theme.primary}
            />
            <Text style={[styles.goalPill, { color: theme.primary }]}>
              {profile.goal === 'lose_weight' || profile.goal === 'lose_weight_fast'
                ? 'Giảm mỡ an toàn'
                : profile.goal === 'gain_muscle' || profile.goal === 'gain_weight'
                ? 'Tăng cơ nạc'
                : 'Duy trì thể trạng'}
            </Text>
            {onOpenOnboarding && (
              <Ionicons name="sparkles" size={10} color={theme.primary} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.dateArrowBtn,
            {
              backgroundColor: theme.cardElevated,
              borderColor: theme.cardBorderStrong || theme.cardBorder,
            },
          ]}
          onPress={() => changeDate(1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* 1. Calorie SVG Ring Card */}
      <CalorieCard
        consumed={dailyTotals.calories}
        target={profile.targetCalories}
        isDark={isDark}
      />

      {/* 2. Macro Nutrients Balance Card */}
      <MacroCard
        current={dailyTotals}
        targets={{
          protein: profile.targetProtein,
          carbs: profile.targetCarbs,
          fat: profile.targetFat,
        }}
        isDark={isDark}
      />

      {/* 3. Water Intake Tracker Widget */}
      <WaterWidget
        currentWater={currentWater}
        waterGoal={profile.waterGoal}
        onAddWater={onAddWater}
        onResetWater={onResetWater}
        onOpenReminder={onOpenWaterReminder}
        isDark={isDark}
      />

      {/* 4. Meals Breakdown (Breakfast, Lunch, Dinner, Snack) */}
      <MealListSection
        mealsByType={mealsByType}
        onOpenScannerForMeal={onOpenScanner}
        onManualAddForMeal={onOpenManualAdd}
        onDeleteMeal={onDeleteMeal}
        onViewMealDetail={onViewMealDetail}
        isDark={isDark}
      />
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
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      } as any,
    }),
  },
  dateArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenterCol: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  goalPill: {
    fontSize: 11,
    fontWeight: '700',
  },
});
