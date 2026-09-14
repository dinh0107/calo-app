import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { FoodItem, MealEntry, MealType } from '../../types/food';
import { COLORS } from '../../theme/colors';

interface QuickStaple {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionUnit: string;
}

const COMMON_STAPLES: QuickStaple[] = [
  { name: 'Cơm trắng (1 chén)', calories: 200, protein: 4, carbs: 45, fat: 0.5, portionUnit: '1 chén (150g)' },
  { name: 'Ức gà áp chảo (150g)', calories: 240, protein: 46, carbs: 0, fat: 5, portionUnit: '1 phần (150g)' },
  { name: 'Trứng gà luộc (2 quả)', calories: 155, protein: 13, carbs: 1, fat: 10.5, portionUnit: '2 quả (100g)' },
  { name: 'Rau xanh luộc', calories: 45, protein: 2.5, carbs: 8, fat: 0.5, portionUnit: '1 đĩa (200g)' },
  { name: 'Sữa chua không đường', calories: 90, protein: 7, carbs: 9, fat: 1.8, portionUnit: '1 hộp (100g)' },
  { name: 'Chuối tiêu (1 quả)', calories: 90, protein: 1, carbs: 23, fat: 0.3, portionUnit: '1 quả (100g)' },
];

interface ManualAddModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  selectedDate: string;
  onAddMeal: (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => void;
  isDark: boolean;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  visible,
  onClose,
  defaultMealType = 'lunch',
  selectedDate,
  onAddMeal,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('350');
  const [protein, setProtein] = useState('20');
  const [carbs, setCarbs] = useState('45');
  const [fat, setFat] = useState('10');
  const [portionUnit, setPortionUnit] = useState('1 phần');
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [notes, setNotes] = useState('');

  const handleSelectPreset = (preset: QuickStaple) => {
    setName(preset.name);
    setCalories(String(preset.calories));
    setProtein(String(preset.protein));
    setCarbs(String(preset.carbs));
    setFat(String(preset.fat));
    setPortionUnit(preset.portionUnit || '1 phần');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const newFood: FoodItem = {
      id: 'manual_' + Date.now(),
      name: name.trim(),
      portionSize: 300,
      portionUnit: portionUnit || '1 phần',
      category: 'khác',
      confidence: 100,
      healthScore: 80,
      macros: {
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
      },
      ingredients: [{ name: name.trim(), weight: 300, calories: Number(calories) || 0 }],
      nutritionTip: 'Món ăn tự ghi nhận vào nhật ký.',
    };

    onAddMeal({
      date: selectedDate,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      mealType,
      food: newFood,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder }]}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Ghi Món Ăn Thủ Công</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick preset chips */}
          <View style={styles.presetSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Gợi ý nhanh:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {COMMON_STAPLES.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetChip, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                  onPress={() => handleSelectPreset(p)}
                >
                  <Text style={[styles.presetChipText, { color: theme.text }]}>
                    {p.name} ({p.calories}k)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Form */}
          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tên món ăn: *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                placeholder="VD: Trứng luộc 2 quả, Cơm gà..."
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Khẩu phần:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder="1 phần, 200g..."
                  placeholderTextColor={theme.textMuted}
                  value={portionUnit}
                  onChangeText={setPortionUnit}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Bữa ăn:</Text>
                <View style={styles.mealSelectRow}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => {
                    const isSel = mealType === m;
                    const labels: Record<MealType, string> = { breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối', snack: 'Phụ' };
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.mealChip,
                          isSel
                            ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                            : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                        ]}
                        onPress={() => setMealType(m)}
                      >
                        <Text
                          style={[
                            styles.mealChipText,
                            { color: isSel ? theme.primary : theme.textSecondary },
                            isSel && { fontWeight: '800' },
                          ]}
                        >
                          {labels[m]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 4 Macros */}
            <View style={styles.macroInputsRow}>
              <View style={styles.macroInputCol}>
                <Text style={[styles.macroLabel, { color: theme.primary }]}>Calo (k):</Text>
                <TextInput
                  style={[styles.macroInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.primary }]}
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={styles.macroInputCol}>
                <Text style={[styles.macroLabel, { color: theme.protein }]}>Đạm (g):</Text>
                <TextInput
                  style={[styles.macroInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.protein }]}
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>

              <View style={styles.macroInputCol}>
                <Text style={[styles.macroLabel, { color: theme.carbs }]}>Carbs (g):</Text>
                <TextInput
                  style={[styles.macroInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.carbs }]}
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>

              <View style={styles.macroInputCol}>
                <Text style={[styles.macroLabel, { color: theme.fat }]}>Béo (g):</Text>
                <TextInput
                  style={[styles.macroInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.fat }]}
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Ghi chú thêm:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                placeholder="Ghi chú thêm..."
                placeholderTextColor={theme.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          <View style={[styles.bottomActions, { borderTopColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>Lưu Vào Nhật Ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  presetSection: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  presetScroll: {
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
  },
  formScroll: {
    maxHeight: 320,
  },
  formGroup: {
    gap: 4,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mealSelectRow: {
    flexDirection: 'row',
    gap: 4,
  },
  mealChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  mealChipText: {
    fontSize: 10,
  },
  macroInputsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  macroInputCol: {
    flex: 1,
    gap: 3,
  },
  macroLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  macroInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
