import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MealEntry, MealType, IngredientItem } from '../../types/food';
import { COLORS } from '../../theme/colors';

interface MealDetailModalProps {
  meal: MealEntry | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isDark: boolean;
}

const MEAL_TYPE_CONFIG: Record<
  MealType,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }
> = {
  breakfast: { label: 'Bữa Sáng', icon: 'coffee-outline', color: '#f59e0b' },
  lunch: { label: 'Bữa Trưa', icon: 'white-balance-sunny', color: '#10b981' },
  dinner: { label: 'Bữa Tối', icon: 'moon-waning-crescent', color: '#818cf8' },
  snack: { label: 'Bữa Phụ', icon: 'cookie-outline', color: '#fb7185' },
};

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  meal,
  onClose,
  onDelete,
  onDuplicate,
  isDark,
}) => {
  if (!meal) return null;

  const theme = isDark ? COLORS.dark : COLORS.light;
  const food = meal.food;
  const mealConfig = MEAL_TYPE_CONFIG[meal.mealType] || MEAL_TYPE_CONFIG.lunch;

  const handleDelete = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(`Bạn có chắc chắn muốn xoá món "${food.vietnameseName || food.name}" khỏi nhật ký?`);
      if (ok) {
        onDelete(meal.id);
        onClose();
      }
    } else {
      Alert.alert(
        'Xác nhận xoá',
        `Bạn có chắc chắn muốn xoá món "${food.vietnameseName || food.name}" khỏi nhật ký?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Xoá ngay',
            style: 'destructive',
            onPress: () => {
              onDelete(meal.id);
              onClose();
            },
          },
        ]
      );
    }
  };

  const handleDuplicate = () => {
    onDuplicate(meal.id);
    onClose();
  };

  return (
    <Modal
      visible={!!meal}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header Bar */}
          <View style={[styles.headerBar, { borderBottomColor: theme.cardBorder }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.mealTypeBadge, { backgroundColor: mealConfig.color + '20' }]}>
                <MaterialCommunityIcons name={mealConfig.icon} size={15} color={mealConfig.color} />
                <Text style={[styles.mealTypeText, { color: mealConfig.color }]}>
                  {mealConfig.label}
                </Text>
              </View>
              <Text style={[styles.timeText, { color: theme.textMuted }]}>
                {meal.time || '12:00'} • {meal.date}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Image Banner */}
            {food.imageUrl ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: food.imageUrl }} style={styles.foodImage} resizeMode="cover" />
                <View style={styles.imageOverlayBadge}>
                  <Text style={styles.imageOverlayText}>
                    {food.portionUnit || `${food.portionSize}g`}
                  </Text>
                </View>
                {food.confidence ? (
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={12} color="#ffffff" />
                    <Text style={styles.aiBadgeText}>
                      AI {Math.round(food.confidence)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Food Title & Category */}
            <View style={styles.titleSection}>
              <Text style={[styles.foodTitle, { color: theme.text }]}>
                {food.vietnameseName || food.name}
              </Text>
              {food.vietnameseName && food.name && food.vietnameseName !== food.name ? (
                <Text style={[styles.foodSubtitle, { color: theme.textMuted }]}>
                  {food.name}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <View style={[styles.categoryTag, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="folder-outline" size={12} color={theme.textSecondary} />
                  <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
                    {food.category || 'Món ăn'}
                  </Text>
                </View>
                <View style={[styles.categoryTag, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <MaterialCommunityIcons name="scale" size={12} color={theme.textSecondary} />
                  <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
                    {food.portionSize}g
                  </Text>
                </View>
                {food.healthScore ? (
                  <View style={[styles.categoryTag, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                    <Ionicons name="star" size={12} color={theme.primary} />
                    <Text style={[styles.categoryText, { color: theme.primary, fontWeight: '700' }]}>
                      Điểm sức khoẻ: {food.healthScore}/100
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Nutrition Macro 4-Grid */}
            <View style={styles.macroSection}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                GIÁ TRỊ DINH DƯỠNG ({food.portionUnit || `${food.portionSize}g`})
              </Text>
              <View style={styles.macroGrid}>
                {/* Calories */}
                <View style={[styles.macroPillCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <MaterialCommunityIcons name="fire" size={16} color="#f59e0b" style={{ marginBottom: 2 }} />
                  <Text style={[styles.macroValue, { color: theme.text }]}>
                    {Math.round(food.macros.calories)}
                  </Text>
                  <Text style={[styles.macroUnit, { color: theme.textMuted }]}>kcal</Text>
                  <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Calories</Text>
                </View>

                {/* Protein */}
                <View style={[styles.macroPillCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <MaterialCommunityIcons name="arm-flex" size={16} color={theme.protein} style={{ marginBottom: 2 }} />
                  <Text style={[styles.macroValue, { color: theme.protein }]}>
                    {Math.round(food.macros.protein)}
                  </Text>
                  <Text style={[styles.macroUnit, { color: theme.textMuted }]}>g</Text>
                  <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Protein</Text>
                </View>

                {/* Carbs */}
                <View style={[styles.macroPillCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <MaterialCommunityIcons name="barley" size={16} color={theme.carbs} style={{ marginBottom: 2 }} />
                  <Text style={[styles.macroValue, { color: theme.carbs }]}>
                    {Math.round(food.macros.carbs)}
                  </Text>
                  <Text style={[styles.macroUnit, { color: theme.textMuted }]}>g</Text>
                  <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Carbs</Text>
                </View>

                {/* Fat */}
                <View style={[styles.macroPillCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="water" size={16} color={theme.fat} style={{ marginBottom: 2 }} />
                  <Text style={[styles.macroValue, { color: theme.fat }]}>
                    {Math.round(food.macros.fat)}
                  </Text>
                  <Text style={[styles.macroUnit, { color: theme.textMuted }]}>g</Text>
                  <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>Chất béo</Text>
                </View>
              </View>

              {/* Secondary Micronutrients */}
              {(food.macros.fiber !== undefined || food.macros.sodium !== undefined) ? (
                <View style={[styles.microRow, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  {food.macros.fiber !== undefined ? (
                    <View style={styles.microItem}>
                      <MaterialCommunityIcons name="leaf" size={13} color={theme.primary} />
                      <Text style={[styles.microText, { color: theme.textSecondary }]}>
                        Chất xơ: <Text style={{ color: theme.text, fontWeight: '700' }}>{Math.round(food.macros.fiber)}g</Text>
                      </Text>
                    </View>
                  ) : null}
                  {food.macros.sodium !== undefined ? (
                    <View style={styles.microItem}>
                      <Ionicons name="sparkles-outline" size={13} color="#0ea5e9" />
                      <Text style={[styles.microText, { color: theme.textSecondary }]}>
                        Natri: <Text style={{ color: theme.text, fontWeight: '700' }}>{Math.round(food.macros.sodium)}mg</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* AI Nutrition Tip Callout */}
            {food.nutritionTip ? (
              <View style={[styles.aiTipCard, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                <View style={styles.aiTipHeader}>
                  <MaterialCommunityIcons name="lightbulb-on" size={18} color={theme.primary} />
                  <Text style={[styles.aiTipTitle, { color: theme.primary }]}>
                    Lời Khuyên Dinh Dưỡng AI
                  </Text>
                </View>
                <Text style={[styles.aiTipContent, { color: theme.text }]}>
                  {food.nutritionTip}
                </Text>
              </View>
            ) : null}

            {/* Ingredients Breakdown */}
            {food.ingredients && food.ingredients.length > 0 ? (
              <View style={styles.ingredientsSection}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  THÀNH PHẦN CHI TIẾT
                </Text>
                <View style={[styles.ingredientsTable, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  {food.ingredients.map((ing: IngredientItem, idx: number) => (
                    <View
                      key={idx}
                      style={[
                        styles.ingredientRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: theme.cardBorder },
                      ]}
                    >
                      <View style={styles.ingredientLeft}>
                        <Text style={[styles.ingredientName, { color: theme.text }]}>
                          {ing.name}
                        </Text>
                        <Text style={[styles.ingredientAmount, { color: theme.textMuted }]}>
                          {ing.weight}g
                        </Text>
                      </View>
                      <View style={styles.ingredientRight}>
                        <Text style={[styles.ingredientCals, { color: theme.primary }]}>
                          {ing.calories} kcal
                        </Text>
                        {(ing.protein !== undefined || ing.carbs !== undefined || ing.fat !== undefined) ? (
                          <Text style={[styles.ingredientMacros, { color: theme.textMuted }]}>
                            P:{ing.protein || 0}g C:{ing.carbs || 0}g F:{ing.fat || 0}g
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* User Notes */}
            {meal.notes ? (
              <View style={styles.notesSection}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  GHI CHÚ CỦA BẠN
                </Text>
                <View style={[styles.notesCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.notesText, { color: theme.text }]}>
                    {meal.notes}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Action Footer Buttons */}
          <View style={[styles.footerBar, { borderTopColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[styles.duplicateBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={handleDuplicate}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={17} color={theme.text} />
              <Text style={[styles.duplicateBtnText, { color: theme.text }]}>Nhân đôi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Xoá món</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
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
    paddingHorizontal: 18,
  },
  imageContainer: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 14,
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  aiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  titleSection: {
    marginTop: 14,
  },
  foodTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  foodSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  macroSection: {
    marginTop: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPillCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  macroUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  microItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  microText: {
    fontSize: 12,
  },
  aiTipCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  aiTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiTipTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  aiTipContent: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  ingredientsSection: {
    marginTop: 18,
  },
  ingredientsTable: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ingredientLeft: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientAmount: {
    fontSize: 11,
    marginTop: 2,
  },
  ingredientRight: {
    alignItems: 'flex-end',
  },
  ingredientCals: {
    fontSize: 12,
    fontWeight: '800',
  },
  ingredientMacros: {
    fontSize: 10,
    marginTop: 2,
  },
  notesSection: {
    marginTop: 18,
  },
  notesCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 10,
  },
  duplicateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  duplicateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
