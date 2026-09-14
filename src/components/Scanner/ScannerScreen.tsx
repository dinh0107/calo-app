import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { FoodItem, MealEntry, MealType } from '../../types/food';
import { analyzeFoodImage } from '../../services/geminiVision';
import { COLORS } from '../../theme/colors';

interface ScannerScreenProps {
  apiKey?: string;
  defaultMealType?: MealType;
  selectedDate: string;
  onSaveMeal: (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => void;
  onClose?: () => void;
  onOpenProfileForApiKey?: () => void;
  isDark: boolean;
}

const QUICK_DISH_SUGGESTIONS = [
  '🍜 Phở bò tái nạm',
  '🥗 Salad ức gà sốt mè',
  '🍛 Cơm tấm sườn bì chả',
  '🥪 Bánh mì bơ trứng',
  '🍲 Bún chả Hà Nội',
  '🥑 Yến mạch trái cây',
];

const SCAN_STEPS = [
  { label: 'Phân tích hình thái món ăn', icon: 'camera-outline' },
  { label: 'Bóc tách thành phần & khối lượng', icon: 'layers-outline' },
  { label: 'Tính toán Calo, Đạm, Tinh bột & Chất béo', icon: 'calculator-outline' },
  { label: 'Tổng hợp lời khuyên từ chuyên gia AI', icon: 'sparkles-outline' },
];

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  apiKey,
  defaultMealType = 'lunch',
  selectedDate,
  onSaveMeal,
  onClose,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [userHint, setUserHint] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scannedFood, setScannedFood] = useState<FoodItem | null>(null);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [targetMealType, setTargetMealType] = useState<MealType>(defaultMealType);
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeResultAnim = useRef(new Animated.Value(0)).current;

  // Scanning laser animation loop
  useEffect(() => {
    let laserLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (isScanning) {
      laserLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      laserLoop.start();

      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      laserAnim.setValue(0);
      pulseAnim.setValue(1);
    }

    return () => {
      laserLoop?.stop();
      pulseLoop?.stop();
    };
  }, [isScanning]);

  // Fade in result when scan completes
  useEffect(() => {
    if (scannedFood && !isScanning) {
      fadeResultAnim.setValue(0);
      Animated.timing(fadeResultAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [scannedFood, isScanning]);

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cấp quyền máy ảnh', 'Vui lòng cho phép quyền Camera để chụp ảnh món ăn của bạn.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const base64Data = result.assets[0].base64
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : uri;
        setSelectedImage(uri);
        handleAnalyze(base64Data);
      }
    } catch (e: any) {
      Alert.alert('Lỗi Máy Ảnh', e.message || 'Không thể khởi động camera.');
    }
  };

  // Pick photo from gallery
  const handlePickGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cấp quyền thư viện ảnh', 'Vui lòng cho phép quyền truy cập Thư viện ảnh để chọn món ăn.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const base64Data = result.assets[0].base64
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : uri;
        setSelectedImage(uri);
        handleAnalyze(base64Data);
      }
    } catch (e: any) {
      Alert.alert('Lỗi Thư Viện', e.message || 'Không thể mở thư viện ảnh.');
    }
  };

  // Run AI analysis
  const handleAnalyze = async (imageUrl: string) => {
    setIsScanning(true);
    setApiError(null);
    setPortionMultiplier(1);
    setCurrentStepIndex(0);

    const stepTimer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < SCAN_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    try {
      const res = await analyzeFoodImage(imageUrl, apiKey, userHint);
      setScannedFood(res.food);
      setModelUsed(res.modelUsed);
      if (res.error) setApiError(res.error);
    } catch (err: any) {
      setApiError(err.message || 'Không thể phân tích bức ảnh này.');
    } finally {
      clearInterval(stepTimer);
      setIsScanning(false);
    }
  };

  // Calculated macros based on portion multiplier
  const calculatedMacros = scannedFood
    ? {
        calories: Math.round(scannedFood.macros.calories * portionMultiplier),
        protein: Math.round(scannedFood.macros.protein * portionMultiplier * 10) / 10,
        carbs: Math.round(scannedFood.macros.carbs * portionMultiplier * 10) / 10,
        fat: Math.round(scannedFood.macros.fat * portionMultiplier * 10) / 10,
        fiber: scannedFood.macros.fiber ? Math.round(scannedFood.macros.fiber * portionMultiplier * 10) / 10 : undefined,
        sodium: scannedFood.macros.sodium ? Math.round(scannedFood.macros.sodium * portionMultiplier) : undefined,
      }
    : null;

  const calculatedWeight = scannedFood
    ? Math.round(scannedFood.portionSize * portionMultiplier)
    : 0;

  // Macro Energy Ratios
  const proteinKcal = (calculatedMacros?.protein || 0) * 4;
  const carbsKcal = (calculatedMacros?.carbs || 0) * 4;
  const fatKcal = (calculatedMacros?.fat || 0) * 9;
  const totalKcalCalc = proteinKcal + carbsKcal + fatKcal || 1;
  const proteinPct = Math.round((proteinKcal / totalKcalCalc) * 100);
  const carbsPct = Math.round((carbsKcal / totalKcalCalc) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  // Save to daily diary
  const handleSave = () => {
    if (!scannedFood || !calculatedMacros) return;

    const finalFoodItem: FoodItem = {
      ...scannedFood,
      portionSize: calculatedWeight,
      portionUnit: `${calculatedWeight}g (${portionMultiplier}x khẩu phần)`,
      macros: calculatedMacros,
      ingredients: scannedFood.ingredients.map((ing) => ({
        ...ing,
        weight: Math.round(ing.weight * portionMultiplier),
        calories: Math.round(ing.calories * portionMultiplier),
      })),
    };

    onSaveMeal({
      date: selectedDate,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      mealType: targetMealType,
      food: finalFoodItem,
      notes: notes.trim() || undefined,
    });
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 190],
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
            <Ionicons name="sparkles" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Trợ Lý Nhận Diện Món Ăn AI</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Chụp ảnh đĩa thức ăn bất kỳ để AI tự động bóc tách calo & dưỡng chất chi tiết.
            </Text>
          </View>
        </View>

        {/* AI Ready Status Pill */}
        <View
          style={[
            styles.apiNoticeBadge,
            {
              backgroundColor: theme.primaryBg,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <View style={[styles.onlineDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.apiNoticeText, { color: theme.primary }]}>
            AI Vision Thông Minh • Tự Động Phân Tích Khẩu Phần
          </Text>
        </View>
      </View>

      {/* 2. Photo Capture / Upload Actions (When idle) */}
      {!scannedFood && !isScanning && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Chọn phương thức nhận diện món ăn:
          </Text>

          {/* 2 Big Action Buttons */}
          <View style={styles.heroActionsContainer}>
            <TouchableOpacity
              style={[styles.heroActionBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}
              onPress={handleTakePhoto}
              activeOpacity={0.82}
            >
              <View style={[styles.heroIconCircle, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={26} color="#ffffff" />
              </View>
              <Text style={[styles.heroActionTitle, { color: theme.primary }]}>Chụp Ảnh Món Ăn</Text>
              <Text style={[styles.heroActionSub, { color: theme.textSecondary }]}>
                Mở camera hướng về đĩa thức ăn
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroActionBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={handlePickGallery}
              activeOpacity={0.82}
            >
              <View style={[styles.heroIconCircle, { backgroundColor: theme.cardBorderStrong || '#334155' }]}>
                <Ionicons name="image" size={26} color="#ffffff" />
              </View>
              <Text style={[styles.heroActionTitle, { color: theme.text }]}>Tải Từ Thư Viện</Text>
              <Text style={[styles.heroActionSub, { color: theme.textSecondary }]}>
                Chọn ảnh chụp sẵn từ thiết bị
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Dish Description / Hint Input */}
          <View style={styles.hintSection}>
            <View style={styles.hintLabelRow}>
              <Ionicons name="create-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.hintLabel, { color: theme.textSecondary }]}>
                Gợi ý nhanh cho AI (Tùy chọn):
              </Text>
            </View>
            <TextInput
              style={[
                styles.hintInput,
                { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text },
              ]}
              placeholder="VD: Phở bò tái nạm ít bánh, Cơm gà xối mỡ, Salad ức gà..."
              placeholderTextColor={theme.textMuted}
              value={userHint}
              onChangeText={setUserHint}
            />

            {/* Quick Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsContainer}>
              {QUICK_DISH_SUGGESTIONS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.quickChip, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                  onPress={() => setUserHint(chip.replace(/^[^\s]+\s/, ''))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickChipText, { color: theme.textSecondary }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 3. Futuristic Scanning Laser & HUD State */}
      {isScanning && (
        <View style={[styles.scanningCard, { backgroundColor: theme.card, borderColor: theme.primaryBorder }]}>
          {selectedImage && (
            <Animated.View style={[styles.scanImageWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <Image source={{ uri: selectedImage }} style={styles.scanPreviewImg} />
              
              {/* HUD Corner Brackets */}
              <View style={[styles.hudCorner, styles.hudTopLeft, { borderColor: theme.primary }]} />
              <View style={[styles.hudCorner, styles.hudTopRight, { borderColor: theme.primary }]} />
              <View style={[styles.hudCorner, styles.hudBottomLeft, { borderColor: theme.primary }]} />
              <View style={[styles.hudCorner, styles.hudBottomRight, { borderColor: theme.primary }]} />

              {/* Animated Laser Scanning Line */}
              <Animated.View
                style={[
                  styles.laserLine,
                  {
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                    transform: [{ translateY: laserTranslateY }],
                  },
                ]}
              />

              {/* Viewfinder Center Crosshair */}
              <View style={styles.crosshairCenter}>
                <Ionicons name="scan" size={28} color="rgba(255,255,255,0.7)" />
              </View>
            </Animated.View>
          )}

          <Text style={[styles.scanningTitle, { color: theme.text }]}>AI Đang Phân Tích Dinh Dưỡng...</Text>

          {/* 4 Step Progress Tracker */}
          <View style={styles.stepsContainer}>
            {SCAN_STEPS.map((st, i) => {
              const isDone = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <View key={i} style={styles.stepItemRow}>
                  <View
                    style={[
                      styles.stepIconDot,
                      isDone
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : isCurrent
                        ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                        : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <View style={[styles.stepDotInner, { backgroundColor: theme.textMuted }]} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabelText,
                      { color: isDone || isCurrent ? theme.text : theme.textMuted },
                      isCurrent && { fontWeight: '700', color: theme.primary },
                    ]}
                  >
                    {st.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 4. Interactive Analysis Result Card */}
      {scannedFood && !isScanning && calculatedMacros && (
        <Animated.View
          style={[
            styles.resultCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              opacity: fadeResultAnim,
            },
          ]}
        >
          {/* Success Banner */}
          <View style={[styles.sourceLiveBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
            <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sourceLiveTitle, { color: theme.primary }]}>
                Phân Tích Dinh Dưỡng Thành Công
              </Text>
              <Text style={[styles.sourceLiveSub, { color: theme.textSecondary }]}>
                Độ chính xác {scannedFood.confidence}% • Calo & Macros ước tính chuẩn xác
              </Text>
            </View>
          </View>

          {/* Dish Visual Header */}
          <View style={styles.resultHeaderRow}>
            {scannedFood.imageUrl && (
              <Image source={{ uri: scannedFood.imageUrl }} style={styles.resultImage} />
            )}
            <View style={styles.resultHeaderCol}>
              <View style={styles.badgeGroup}>
                <View style={[styles.pillBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                  <Ionicons name="sparkles" size={11} color={theme.primary} />
                  <Text style={[styles.pillBadgeText, { color: theme.primary }]}>
                    AI Vision
                  </Text>
                </View>
                <View style={[styles.pillBadge, { backgroundColor: theme.proteinBg, borderColor: theme.proteinBorder }]}>
                  <Ionicons name="shield-checkmark" size={11} color={theme.protein} />
                  <Text style={[styles.pillBadgeText, { color: theme.protein }]}>
                    Điểm Sức Khỏe: {scannedFood.healthScore}/100
                  </Text>
                </View>
              </View>

              <Text style={[styles.resultDishName, { color: theme.text }]}>
                {scannedFood.vietnameseName || scannedFood.name}
              </Text>
              <Text style={[styles.resultDishSub, { color: theme.textSecondary }]}>
                Khẩu phần tiêu chuẩn: {scannedFood.portionUnit || `${scannedFood.portionSize}g`}
              </Text>
            </View>
          </View>

          {/* AI Nutritionist Advice Box */}
          {scannedFood.nutritionTip && (
            <View style={[styles.tipBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
              <View style={[styles.tipIconBadge, { backgroundColor: theme.primaryBg }]}>
                <Ionicons name="bulb" size={14} color={theme.primary} />
              </View>
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                <Text style={{ color: theme.primary, fontWeight: '800' }}>Lời khuyên AI: </Text>
                {scannedFood.nutritionTip}
              </Text>
            </View>
          )}

          {/* 4 Big Macro Metric Tiles */}
          <View style={styles.macrosGrid}>
            <View style={[styles.macroBox, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
              <MaterialCommunityIcons name="fire" size={20} color={theme.primary} />
              <Text style={[styles.macroBoxLabel, { color: theme.textSecondary }]}>Calories</Text>
              <Text style={[styles.macroBoxVal, { color: theme.primary }]}>
                {calculatedMacros.calories}
              </Text>
              <Text style={[styles.macroBoxUnit, { color: theme.textMuted }]}>kcal</Text>
            </View>

            <View style={[styles.macroBox, { backgroundColor: theme.proteinBg, borderColor: theme.proteinBorder }]}>
              <MaterialCommunityIcons name="arm-flex" size={20} color={theme.protein} />
              <Text style={[styles.macroBoxLabel, { color: theme.textSecondary }]}>Chất Đạm</Text>
              <Text style={[styles.macroBoxVal, { color: theme.protein }]}>
                {calculatedMacros.protein}g
              </Text>
              <Text style={[styles.macroBoxUnit, { color: theme.textMuted }]}>{proteinPct}% calo</Text>
            </View>

            <View style={[styles.macroBox, { backgroundColor: theme.carbsBg, borderColor: theme.carbsBorder }]}>
              <MaterialCommunityIcons name="barley" size={20} color={theme.carbs} />
              <Text style={[styles.macroBoxLabel, { color: theme.textSecondary }]}>Tinh Bột</Text>
              <Text style={[styles.macroBoxVal, { color: theme.carbs }]}>
                {calculatedMacros.carbs}g
              </Text>
              <Text style={[styles.macroBoxUnit, { color: theme.textMuted }]}>{carbsPct}% calo</Text>
            </View>

            <View style={[styles.macroBox, { backgroundColor: theme.fatBg, borderColor: theme.fatBorder }]}>
              <Ionicons name="water" size={20} color={theme.fat} />
              <Text style={[styles.macroBoxLabel, { color: theme.textSecondary }]}>Chất Béo</Text>
              <Text style={[styles.macroBoxVal, { color: theme.fat }]}>
                {calculatedMacros.fat}g
              </Text>
              <Text style={[styles.macroBoxUnit, { color: theme.textMuted }]}>{fatPct}% calo</Text>
            </View>
          </View>

          {/* Macro Ratio Progress Bar */}
          <View style={styles.ratioBarContainer}>
            <View style={styles.ratioBarTrack}>
              <View style={[styles.ratioBarSegment, { width: `${proteinPct}%`, backgroundColor: theme.protein }]} />
              <View style={[styles.ratioBarSegment, { width: `${carbsPct}%`, backgroundColor: theme.carbs }]} />
              <View style={[styles.ratioBarSegment, { width: `${fatPct}%`, backgroundColor: theme.fat }]} />
            </View>
            <View style={styles.ratioLegendRow}>
              <Text style={[styles.legendItem, { color: theme.protein }]}>• Đạm {proteinPct}%</Text>
              <Text style={[styles.legendItem, { color: theme.carbs }]}>• Tinh bột {carbsPct}%</Text>
              <Text style={[styles.legendItem, { color: theme.fat }]}>• Chất béo {fatPct}%</Text>
            </View>
          </View>

          {/* Portion Multiplier Selector */}
          <View style={[styles.portionSection, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <View style={styles.portionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="scale-outline" size={16} color={theme.primary} />
                <Text style={[styles.portionTitle, { color: theme.text }]}>Điều chỉnh khẩu phần ăn thực tế:</Text>
              </View>
              <View style={[styles.portionValBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                <Text style={[styles.portionValText, { color: theme.primary }]}>
                  {calculatedWeight}g ({portionMultiplier}x)
                </Text>
              </View>
            </View>

            <View style={styles.multiplierButtonsRow}>
              {[
                { label: '0.5x Nửa phần', val: 0.5 },
                { label: '1.0x Chuẩn', val: 1.0 },
                { label: '1.5x Phần lớn', val: 1.5 },
                { label: '2.0x Gấp đôi', val: 2.0 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.val}
                  style={[
                    styles.multiplierBtn,
                    portionMultiplier === item.val
                      ? [styles.multiplierBtnActive, { backgroundColor: theme.primaryBg, borderColor: theme.primary }]
                      : { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}
                  onPress={() => setPortionMultiplier(item.val)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.multiplierBtnText,
                      { color: portionMultiplier === item.val ? theme.primary : theme.textSecondary },
                      portionMultiplier === item.val && { fontWeight: '800' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ingredients Table */}
          {scannedFood.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={[styles.ingredientsTitle, { color: theme.text }]}>
                Thành phần nguyên liệu chi tiết:
              </Text>
              <View style={[styles.ingredientsCard, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                {scannedFood.ingredients.map((ing, idx) => (
                  <View key={idx} style={[styles.ingRow, { borderBottomColor: theme.cardBorder }]}>
                    <Text style={[styles.ingName, { color: theme.text }]}>{ing.name}</Text>
                    <Text style={[styles.ingMeta, { color: theme.textSecondary }]}>
                      {Math.round(ing.weight * portionMultiplier)}g •{' '}
                      <Text style={{ color: theme.primary, fontWeight: '800' }}>
                        {Math.round(ing.calories * portionMultiplier)} kcal
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Select Target Meal Type */}
          <View style={styles.mealTypeSelectSection}>
            <Text style={[styles.mealTypeLabel, { color: theme.text }]}>Lưu vào bữa ăn trong ngày:</Text>
            <View style={styles.mealTypeButtonsRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mType) => {
                const config: Record<MealType, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
                  breakfast: { label: 'Bữa Sáng', icon: 'coffee-outline' },
                  lunch: { label: 'Bữa Trưa', icon: 'white-balance-sunny' },
                  dinner: { label: 'Bữa Tối', icon: 'moon-waning-crescent' },
                  snack: { label: 'Bữa Phụ', icon: 'cookie-outline' },
                };
                const isSelected = targetMealType === mType;
                return (
                  <TouchableOpacity
                    key={mType}
                    style={[
                      styles.mealTypeChip,
                      isSelected
                        ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                        : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                    ]}
                    onPress={() => setTargetMealType(mType)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={config[mType].icon}
                      size={15}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.mealTypeChipText,
                        { color: isSelected ? theme.primary : theme.textSecondary },
                        isSelected && { fontWeight: '800' },
                      ]}
                    >
                      {config[mType].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Optional Notes */}
          <View style={styles.notesSection}>
            <Text style={[styles.mealTypeLabel, { color: theme.text }]}>Ghi chú thêm (Tùy chọn):</Text>
            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text },
              ]}
              placeholder="VD: Ăn cùng gia đình, uống thêm 1 ly nước lọc..."
              placeholderTextColor={theme.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Action Buttons: Rescan & Save */}
          <View style={styles.bottomActionsRow}>
            <TouchableOpacity
              style={[styles.rescanBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
              onPress={() => {
                setScannedFood(null);
                setSelectedImage(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={theme.textSecondary} />
              <Text style={[styles.rescanText, { color: theme.textSecondary }]}>Chụp lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={19} color="#ffffff" />
              <Text style={styles.saveBtnText}>Lưu Vào Nhật Ký</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    paddingBottom: 40,
    gap: 14,
  },
  headerCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  apiNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  apiNoticeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroActionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  heroActionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroActionSub: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  hintSection: {
    gap: 8,
    marginTop: 4,
  },
  hintLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  hintInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
  },
  quickChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scanningCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scanImageWrapper: {
    width: 220,
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scanPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hudCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderWidth: 3,
  },
  hudTopLeft: {
    top: 8,
    left: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  hudTopRight: {
    top: 8,
    right: 8,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  hudBottomLeft: {
    bottom: 8,
    left: 8,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  hudBottomRight: {
    bottom: 8,
    right: 8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  crosshairCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -14 }, { translateY: -14 }],
  },
  scanningTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  stepsContainer: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 8,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  sourceLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sourceLiveTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  sourceLiveSub: {
    fontSize: 11,
    marginTop: 2,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  resultImage: {
    width: 86,
    height: 86,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  resultHeaderCol: {
    flex: 1,
    gap: 4,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  resultDishName: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  resultDishSub: {
    fontSize: 11,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroBox: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 3,
  },
  macroBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  macroBoxVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  macroBoxUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  ratioBarContainer: {
    gap: 6,
  },
  ratioBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ratioBarSegment: {
    height: '100%',
  },
  ratioLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  legendItem: {
    fontSize: 10,
    fontWeight: '700',
  },
  portionSection: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  portionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  portionValBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  portionValText: {
    fontSize: 12,
    fontWeight: '800',
  },
  multiplierButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  multiplierBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  multiplierBtnActive: {
    borderWidth: 1.5,
  },
  multiplierBtnText: {
    fontSize: 11,
  },
  ingredientsSection: {
    gap: 8,
  },
  ingredientsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ingName: {
    fontSize: 12,
    fontWeight: '600',
  },
  ingMeta: {
    fontSize: 12,
  },
  mealTypeSelectSection: {
    gap: 8,
  },
  mealTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  mealTypeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  mealTypeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesSection: {
    gap: 8,
  },
  notesInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  rescanBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rescanText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
