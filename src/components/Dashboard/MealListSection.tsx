import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { MealEntry, MealType } from '../../types/food';
import { COLORS } from '../../theme/colors';

interface MealListSectionProps {
  mealsByType: Record<MealType, { entries: MealEntry[]; totalCalories: number }>;
  onOpenScannerForMeal: (mealType: MealType) => void;
  onManualAddForMeal: (mealType: MealType) => void;
  onDeleteMeal: (id: string) => void;
  onViewMealDetail: (meal: MealEntry) => void;
  isDark: boolean;
}

const MEAL_CONFIG: Record<
  MealType,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; hint: string }
> = {
  breakfast: { label: 'Bữa Sáng', icon: 'coffee-outline', color: '#f59e0b', hint: '06:00 - 09:00' },
  lunch: { label: 'Bữa Trưa', icon: 'white-balance-sunny', color: '#10b981', hint: '11:30 - 13:30' },
  dinner: { label: 'Bữa Tối', icon: 'moon-waning-crescent', color: '#6366f1', hint: '18:00 - 20:30' },
  snack: { label: 'Bữa Phụ / Tráng Miệng', icon: 'cookie-outline', color: '#f43f5e', hint: 'Ăn nhẹ, xế chiều' },
};

export const MealListSection: React.FC<MealListSectionProps> = ({
  mealsByType,
  onOpenScannerForMeal,
  onManualAddForMeal,
  onDeleteMeal,
  onViewMealDetail,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primaryBg }]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={15} color={theme.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Nhật Ký Các Bữa Ăn</Text>
        </View>
        <Text style={[styles.sectionSub, { color: theme.textMuted }]}>4 bữa trong ngày</Text>
      </View>

      <View style={styles.mealGrid}>
        {mealTypes.map((type) => {
          const config = MEAL_CONFIG[type];
          const { entries, totalCalories } = mealsByType[type];

          return (
            <View
              key={type}
              style={[
                styles.mealCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.mealHeader, { borderBottomColor: theme.cardBorder }]}>
                <View style={styles.mealHeaderLeft}>
                  <View
                    style={[
                      styles.mealIconBox,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                        borderColor: theme.cardBorderStrong || theme.cardBorder,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name={config.icon} size={16} color={config.color} />
                  </View>
                  <View>
                    <Text style={[styles.mealName, { color: theme.text }]}>{config.label}</Text>
                    <Text style={[styles.mealHint, { color: theme.textMuted }]}>{config.hint}</Text>
                  </View>
                </View>

                <View style={styles.mealHeaderRight}>
                  <Text style={[styles.mealCalories, { color: theme.text }]}>
                    {totalCalories.toLocaleString()}
                  </Text>
                  <Text style={[styles.kcalUnit, { color: theme.textSecondary }]}> kcal</Text>
                </View>
              </View>

              {/* Entries */}
              <View style={styles.entriesList}>
                {entries.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      Chưa ghi nhận món ăn cho {config.label.toLowerCase()}
                    </Text>
                    <View style={styles.emptyBtnRow}>
                      <TouchableOpacity
                        style={[
                          styles.btnScan,
                          {
                            backgroundColor: theme.primaryBg,
                            borderColor: theme.primaryBorder,
                          },
                        ]}
                        onPress={() => onOpenScannerForMeal(type)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera" size={13} color={theme.primary} />
                        <Text style={[styles.btnScanText, { color: theme.primary }]}>
                          Quét ảnh AI
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.btnManual,
                          {
                            backgroundColor: theme.cardElevated,
                            borderColor: theme.cardBorderStrong || theme.cardBorder,
                          },
                        ]}
                        onPress={() => onManualAddForMeal(type)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={13} color={theme.textSecondary} />
                        <Text style={[styles.btnManualText, { color: theme.textSecondary }]}>
                          Nhập tay
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.itemsWrapper}>
                    {entries.map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={[
                          styles.foodItemRow,
                          {
                            backgroundColor: theme.cardElevated,
                            borderColor: theme.cardBorderStrong || theme.cardBorder,
                          },
                        ]}
                        onPress={() => onViewMealDetail(entry)}
                        activeOpacity={0.7}
                      >
                        {/* Thumbnail */}
                        {entry.food.imageUrl ? (
                          <Image
                            source={{ uri: entry.food.imageUrl }}
                            style={styles.foodThumb}
                          />
                        ) : (
                          <View
                            style={[
                              styles.foodThumbEmoji,
                              { backgroundColor: theme.card, borderColor: theme.cardBorder },
                            ]}
                          >
                            <MaterialCommunityIcons name="food-variant" size={20} color={theme.textSecondary} />
                          </View>
                        )}

                        {/* Dish Details */}
                        <View style={styles.foodDetailCol}>
                          <Text style={[styles.foodTitle, { color: theme.text }]} numberOfLines={1}>
                            {entry.food.vietnameseName || entry.food.name}
                          </Text>
                          <Text style={[styles.foodPortion, { color: theme.textSecondary }]}>
                            {entry.food.portionUnit || `${entry.food.portionSize}g`} • {entry.time}
                          </Text>
                          <View style={styles.macroBadgesRow}>
                            <Text style={[styles.badgeP, { color: theme.protein }]}>
                              P: {Math.round(entry.food.macros.protein)}g
                            </Text>
                            <Text style={[styles.badgeC, { color: theme.carbs }]}>
                              C: {Math.round(entry.food.macros.carbs)}g
                            </Text>
                            <Text style={[styles.badgeF, { color: theme.fat }]}>
                              F: {Math.round(entry.food.macros.fat)}g
                            </Text>
                          </View>
                        </View>

                        {/* Calories & Delete */}
                        <View style={styles.foodRightCol}>
                          <Text style={[styles.foodCaloText, { color: theme.primary }]}>
                            {entry.food.macros.calories} kcal
                          </Text>
                          <TouchableOpacity
                            onPress={() => onDeleteMeal(entry.id)}
                            style={styles.deleteBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={14} color={theme.danger} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Bottom bar when list is not empty */}
              {entries.length > 0 && (
                <View style={[styles.cardFooter, { borderTopColor: theme.cardBorder }]}>
                  <Text style={[styles.itemsCount, { color: theme.textMuted }]}>
                    {entries.length} món đã nạp
                  </Text>
                  <View style={styles.footerBtns}>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => onOpenScannerForMeal(type)}
                    >
                      <Ionicons name="camera-outline" size={13} color={theme.primary} />
                      <Text style={[styles.actionLinkText, { color: theme.primary }]}>
                        Quét thêm
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => onManualAddForMeal(type)}
                    >
                      <Ionicons name="add" size={13} color={theme.textSecondary} />
                      <Text style={[styles.actionLinkText, { color: theme.textSecondary }]}>
                        Nhập tay
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  mealGrid: {
    gap: 12,
  },
  mealCard: {
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
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  mealHint: {
    fontSize: 11,
    marginTop: 1,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '800',
  },
  kcalUnit: {
    fontSize: 11,
  },
  entriesList: {
    paddingVertical: 10,
  },
  emptyContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnScan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnScanText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnManual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnManualText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsWrapper: {
    gap: 8,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  foodThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  foodThumbEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodDetailCol: {
    flex: 1,
    gap: 2,
  },
  foodTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  foodPortion: {
    fontSize: 11,
  },
  macroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  badgeP: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeC: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeF: {
    fontSize: 10,
    fontWeight: '700',
  },
  foodRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  foodCaloText: {
    fontSize: 13,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  itemsCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
