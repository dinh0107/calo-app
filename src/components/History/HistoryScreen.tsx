import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MealEntry, MealType, UserProfile } from '../../types/food';
import { COLORS } from '../../theme/colors';

interface HistoryScreenProps {
  meals: MealEntry[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  profile: UserProfile;
  onOpenScanner: (mealType?: MealType) => void;
  onOpenManualAdd: (mealType?: MealType) => void;
  onDeleteMeal: (id: string) => void;
  onDuplicateMeal: (id: string, targetDate?: string) => void;
  onViewMealDetail: (meal: MealEntry) => void;
  isDark: boolean;
}

const MEAL_ICONS: Record<MealType, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  breakfast: { label: 'Bữa Sáng', icon: 'coffee-outline', color: '#f59e0b' },
  lunch: { label: 'Bữa Trưa', icon: 'white-balance-sunny', color: '#10b981' },
  dinner: { label: 'Bữa Tối', icon: 'moon-waning-crescent', color: '#818cf8' },
  snack: { label: 'Bữa Phụ', icon: 'cookie-outline', color: '#fb7185' },
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  meals,
  selectedDate,
  setSelectedDate,
  profile,
  onOpenScanner,
  onOpenManualAdd,
  onDeleteMeal,
  onDuplicateMeal,
  onViewMealDetail,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const [filterType, setFilterType] = useState<MealType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const dateMeals = meals.filter((m) => m.date === selectedDate);

  const filteredMeals = dateMeals.filter((m) => {
    const matchesType = filterType === 'all' || m.mealType === filterType;
    const matchesSearch =
      m.food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const dayTotals = dateMeals.reduce(
    (acc, m) => {
      acc.calories += m.food.macros.calories || 0;
      acc.protein += m.food.macros.protein || 0;
      acc.carbs += m.food.macros.carbs || 0;
      acc.fat += m.food.macros.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const formattedDate = new Date(selectedDate).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Navigation & Summary */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.dateNavRow}>
          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
            onPress={() => changeDateByDays(-1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.dateInfoCol}>
            <Text style={[styles.dateText, { color: theme.text }]}>{formattedDate}</Text>
            {!isToday && (
              <TouchableOpacity
                style={[styles.todayBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}
                onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[styles.todayBtnText, { color: theme.primary }]}>Về hôm nay</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
            onPress={() => changeDateByDays(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* 4 Mini Day Totals */}
        <View style={[styles.totalsGrid, { borderTopColor: theme.cardBorder }]}>
          <View style={[styles.miniStat, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.miniStatLabel, { color: theme.textSecondary }]}>Calo</Text>
            <Text style={[styles.miniStatVal, { color: theme.primary }]}>
              {dayTotals.calories}
              <Text style={{ fontSize: 9, color: theme.textMuted }}>/{profile.targetCalories}</Text>
            </Text>
          </View>

          <View style={[styles.miniStat, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.miniStatLabel, { color: theme.protein }]}>Đạm (P)</Text>
            <Text style={[styles.miniStatVal, { color: theme.protein }]}>
              {Math.round(dayTotals.protein)}g
            </Text>
          </View>

          <View style={[styles.miniStat, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.miniStatLabel, { color: theme.carbs }]}>Tinh bột (C)</Text>
            <Text style={[styles.miniStatVal, { color: theme.carbs }]}>
              {Math.round(dayTotals.carbs)}g
            </Text>
          </View>

          <View style={[styles.miniStat, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.miniStatLabel, { color: theme.fat }]}>Chất béo (F)</Text>
            <Text style={[styles.miniStatVal, { color: theme.fat }]}>
              {Math.round(dayTotals.fat)}g
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs & Search */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {[
            { key: 'all', label: `Tất cả (${dateMeals.length})`, icon: 'view-grid-outline' as const },
            { key: 'breakfast', label: 'Sáng', icon: 'coffee-outline' as const },
            { key: 'lunch', label: 'Trưa', icon: 'white-balance-sunny' as const },
            { key: 'dinner', label: 'Tối', icon: 'moon-waning-crescent' as const },
            { key: 'snack', label: 'Phụ', icon: 'cookie-outline' as const },
          ].map((item) => {
            const isSelected = filterType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                    : { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
                onPress={() => setFilterType(item.key as any)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={14}
                  color={isSelected ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? theme.primary : theme.textSecondary },
                    isSelected && { fontWeight: '800' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="search" size={15} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Tìm kiếm món ăn..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Meals List */}
      {filteredMeals.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <MaterialCommunityIcons name="silverware-clean" size={36} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Không có món nào trong ngày</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            {searchQuery ? 'Không tìm thấy món phù hợp' : 'Hãy quét hoặc thêm món ăn để ghi lại nhật ký.'}
          </Text>
          <View style={styles.emptyActionRow}>
            <TouchableOpacity
              style={[styles.emptyScanBtn, { backgroundColor: theme.primary }]}
              onPress={() => onOpenScanner()}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={15} color="#ffffff" />
              <Text style={styles.emptyScanBtnText}>Quét Món Ăn AI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyManualBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={() => onOpenManualAdd()}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={15} color={theme.text} />
              <Text style={[styles.emptyManualBtnText, { color: theme.text }]}>Nhập tay</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.mealsListWrapper}>
          {filteredMeals.map((meal) => {
            const config = MEAL_ICONS[meal.mealType];
            const isExpanded = expandedMealId === meal.id;

            return (
              <View
                key={meal.id}
                style={[styles.historyMealCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <TouchableOpacity
                  style={styles.historyMealHeader}
                  onPress={() => onViewMealDetail(meal)}
                  activeOpacity={0.7}
                >
                  {meal.food.imageUrl ? (
                    <Image source={{ uri: meal.food.imageUrl }} style={styles.historyDishImg} />
                  ) : (
                    <View style={[styles.historyDishEmoji, { backgroundColor: theme.cardElevated }]}>
                      <MaterialCommunityIcons name="food-variant" size={20} color={theme.textSecondary} />
                    </View>
                  )}

                  <View style={styles.historyDishInfoCol}>
                    <View style={styles.dishTagRow}>
                      <Text style={[styles.dishMealBadge, { color: config.color }]}>{config.label}</Text>
                      <Text style={[styles.dishTime, { color: theme.textMuted }]}>• {meal.time}</Text>
                      {meal.food.healthScore && (
                        <View style={[styles.healthPill, { backgroundColor: theme.primaryBg }]}>
                          <Text style={[styles.healthPillText, { color: theme.primary }]}>
                            {meal.food.healthScore}đ
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.historyDishTitle, { color: theme.text }]} numberOfLines={1}>
                      {meal.food.name}
                    </Text>
                    <Text style={[styles.historyDishPortion, { color: theme.textSecondary }]}>
                      {meal.food.portionUnit || `${meal.food.portionSize}g`}
                    </Text>
                  </View>

                  <View style={styles.historyDishRightCol}>
                    <Text style={[styles.historyCaloNumber, { color: theme.primary }]}>
                      {meal.food.macros.calories}
                      <Text style={{ fontSize: 9, color: theme.textSecondary }}> kcal</Text>
                    </Text>
                    <View style={styles.historyMacrosRow}>
                      <Text style={[styles.macroP, { color: theme.protein }]}>
                        P:{Math.round(meal.food.macros.protein)}
                      </Text>
                      <Text style={[styles.macroC, { color: theme.carbs }]}>
                        C:{Math.round(meal.food.macros.carbs)}
                      </Text>
                      <Text style={[styles.macroF, { color: theme.fat }]}>
                        F:{Math.round(meal.food.macros.fat)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Actions Bottom Bar */}
                <View style={[styles.historyCardActions, { borderTopColor: theme.cardBorder }]}>
                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => setExpandedMealId(isExpanded ? null : meal.id)}
                  >
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'information-circle-outline'}
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text style={[styles.cardActionText, { color: theme.textSecondary }]}>
                      {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => onDuplicateMeal(meal.id)}
                  >
                    <Ionicons name="copy-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.cardActionText, { color: theme.textSecondary }]}>Sao chép</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => onDeleteMeal(meal.id)}
                  >
                    <Ionicons name="trash-outline" size={13} color={theme.danger} />
                    <Text style={[styles.cardActionText, { color: theme.danger }]}>Xóa</Text>
                  </TouchableOpacity>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: theme.cardBorder }]}>
                    {meal.food.nutritionTip && (
                      <View style={[styles.expandedTip, { backgroundColor: theme.cardElevated }]}>
                        <Ionicons name="heart" size={13} color={theme.primary} />
                        <Text style={[styles.expandedTipText, { color: theme.textSecondary }]}>
                          <Text style={{ color: theme.primary, fontWeight: '700' }}>Lời khuyên AI: </Text>
                          {meal.food.nutritionTip}
                        </Text>
                      </View>
                    )}

                    {meal.food.ingredients?.length > 0 && (
                      <View style={styles.expandedIngsList}>
                        {meal.food.ingredients.map((ing, i) => (
                          <View key={i} style={styles.expandedIngRow}>
                            <Text style={[styles.expandedIngName, { color: theme.text }]}>{ing.name}</Text>
                            <Text style={[styles.expandedIngCalo, { color: theme.primary }]}>
                              {ing.weight}g • {ing.calories} kcal
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
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
  card: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfoCol: {
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  miniStat: {
    flex: 1,
    padding: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  miniStatLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  miniStatVal: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  filterSection: {
    gap: 8,
  },
  filterChipsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  emptyScanBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#080c16',
  },
  emptyManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyManualBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mealsListWrapper: {
    gap: 10,
  },
  historyMealCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  historyDishImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  historyDishEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDishInfoCol: {
    flex: 1,
    gap: 1,
  },
  dishTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dishMealBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  dishTime: {
    fontSize: 10,
  },
  healthPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  healthPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  historyDishTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyDishPortion: {
    fontSize: 10,
  },
  historyDishRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyCaloNumber: {
    fontSize: 14,
    fontWeight: '900',
  },
  historyMacrosRow: {
    flexDirection: 'row',
    gap: 4,
  },
  macroP: {
    fontSize: 9,
    fontWeight: '700',
  },
  macroC: {
    fontSize: 9,
    fontWeight: '700',
  },
  macroF: {
    fontSize: 9,
    fontWeight: '700',
  },
  historyCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandedContent: {
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  expandedTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 10,
  },
  expandedTipText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
  },
  expandedIngsList: {
    gap: 4,
  },
  expandedIngRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  expandedIngName: {
    fontSize: 10,
  },
  expandedIngCalo: {
    fontSize: 10,
    fontWeight: '700',
  },
});
