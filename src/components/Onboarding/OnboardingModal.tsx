import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { UserProfile, ActivityLevel, FitnessGoal } from '../../types/food';
import {
  calculateBMR,
  calculateTDEE,
  calculateNutritionTargets,
} from '../../utils/nutritionCalculators';
import { COLORS } from '../../theme/colors';

interface OnboardingModalProps {
  visible: boolean;
  initialProfile: UserProfile;
  userName?: string;
  onComplete: (completedProfile: Partial<UserProfile>) => void;
  onClose?: () => void;
  isDark: boolean;
}

const TOTAL_STEPS = 5;

const ACTIVITY_OPTIONS: Array<{
  id: ActivityLevel;
  title: string;
  desc: string;
  badge: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  {
    id: 'sedentary',
    title: 'Ít vận động',
    desc: 'Ngồi làm việc văn phòng, hầu như không tập thể dục',
    badge: '1.2x BMR',
    icon: 'chair-rolling',
  },
  {
    id: 'light',
    title: 'Vận động nhẹ',
    desc: 'Đi bộ nhẹ nhàng, tập thể dục nhẹ 1 - 3 ngày/tuần',
    badge: '1.375x BMR',
    icon: 'walk',
  },
  {
    id: 'moderate',
    title: 'Vận động vừa phải',
    desc: 'Tập gym, chạy bộ, chơi thể thao 3 - 5 ngày/tuần',
    badge: '1.55x BMR',
    icon: 'run',
  },
  {
    id: 'active',
    title: 'Năng động',
    desc: 'Tập luyện thể thao cường độ cao 6 - 7 ngày/tuần',
    badge: '1.725x BMR',
    icon: 'bike',
  },
  {
    id: 'very_active',
    title: 'Rất năng động',
    desc: 'Vận động viên hoặc làm việc lao động thể chất nặng',
    badge: '1.9x BMR',
    icon: 'weight-lifter',
  },
];

const GOAL_OPTIONS: Array<{
  id: FitnessGoal;
  title: string;
  desc: string;
  badge: string;
  badgeColor: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  {
    id: 'lose_weight_fast',
    title: 'Giảm cân nhanh',
    desc: 'Thâm hụt -750 kcal/ngày (Dành cho người cần giảm mỡ cấp tốc)',
    badge: '-750 kcal',
    badgeColor: '#ef4444',
    icon: 'trending-down',
  },
  {
    id: 'lose_weight',
    title: 'Giảm cân an toàn',
    desc: 'Thâm hụt -500 kcal/ngày (Khuyên dùng, bền vững và khỏe mạnh)',
    badge: '-500 kcal',
    badgeColor: '#f59e0b',
    icon: 'scale-bathroom',
  },
  {
    id: 'maintain',
    title: 'Duy trì vóc dáng',
    desc: 'Cân bằng calo nạp vào = calo tiêu hao hàng ngày (TDEE)',
    badge: 'Chuẩn TDEE',
    badgeColor: '#10b981',
    icon: 'heart-pulse',
  },
  {
    id: 'gain_muscle',
    title: 'Tăng cơ & Giảm mỡ',
    desc: 'Dư thừa nhẹ +200 kcal/ngày kết hợp tập kháng lực',
    badge: '+200 kcal',
    badgeColor: '#6366f1',
    icon: 'arm-flex',
  },
  {
    id: 'gain_weight',
    title: 'Tăng cân & Tăng thể trọng',
    desc: 'Dư thừa +500 kcal/ngày để tăng cân và thể trọng',
    badge: '+500 kcal',
    badgeColor: '#8b5cf6',
    icon: 'chart-line-variant',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  initialProfile,
  userName,
  onComplete,
  onClose,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState(initialProfile.name || userName || 'Bạn');
  const [gender, setGender] = useState<'male' | 'female'>(initialProfile.gender || 'male');
  const [age, setAge] = useState(String(initialProfile.age || 25));
  const [height, setHeight] = useState(String(initialProfile.height || 170));
  const [weight, setWeight] = useState(String(initialProfile.weight || 65));
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile.activityLevel || 'moderate');
  const [goal, setGoal] = useState<FitnessGoal>(initialProfile.goal || 'maintain');

  const numWeight = Number(weight) || 65;
  const numHeight = Number(height) || 170;
  const numAge = Number(age) || 25;

  // Live Calculations
  const heightM = numHeight / 100;
  const bmi = heightM > 0 ? Number((numWeight / (heightM * heightM)).toFixed(1)) : 22.5;

  let bmiCategory = 'Bình thường';
  let bmiColor = '#10b981';
  if (bmi < 18.5) {
    bmiCategory = 'Thiếu cân / Gầy';
    bmiColor = '#3b82f6';
  } else if (bmi >= 23 && bmi < 25) {
    bmiCategory = 'Tiền thừa cân';
    bmiColor = '#f59e0b';
  } else if (bmi >= 25) {
    bmiCategory = 'Thừa cân / Béo phì';
    bmiColor = '#ef4444';
  }

  const liveBMR = calculateBMR(gender, numWeight, numHeight, numAge);
  const liveTDEE = calculateTDEE(liveBMR, activityLevel);
  const calculatedTargets = calculateNutritionTargets(
    gender,
    numWeight,
    numHeight,
    numAge,
    activityLevel,
    goal
  );

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    onComplete({
      name: name.trim() || 'Người dùng CaloVision',
      gender,
      age: numAge,
      height: numHeight,
      weight: numWeight,
      activityLevel,
      goal,
      targetCalories: calculatedTargets.targetCalories,
      targetProtein: calculatedTargets.targetProtein,
      targetCarbs: calculatedTargets.targetCarbs,
      targetFat: calculatedTargets.targetFat,
      waterGoal: calculatedTargets.waterGoal,
      hasCompletedOnboarding: true,
    });
  };

  if (!visible) return null;

  const stepTitles = [
    'Thông Tin Cơ Bản',
    'Chỉ Số Cơ Thể',
    'Mức Độ Vận Động',
    'Mục Tiêu Dinh Dưỡng',
    'Kế Hoạch Cá Nhân Hóa',
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose || handleFinish}
    >
      <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(2, 6, 23, 0.96)' : 'rgba(248, 250, 252, 0.98)' }]}>
        <View style={[styles.modalWrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Top Wizard Navigation Bar */}
          <View style={[styles.wizardTopBar, { borderBottomColor: theme.cardBorder }]}>
            <View style={styles.topBarLeft}>
              {currentStep > 1 ? (
                <TouchableOpacity
                  style={[styles.navIconBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                  onPress={handleBack}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color={theme.text} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.stepDotPill, { backgroundColor: theme.primaryBg }]}>
                  <Ionicons name="sparkles" size={13} color={theme.primary} />
                </View>
              )}

              <View>
                <Text style={[styles.stepCountText, { color: theme.primary }]}>
                  BƯỚC {currentStep} / {TOTAL_STEPS}
                </Text>
                <Text style={[styles.stepTitleHeader, { color: theme.text }]}>
                  {stepTitles[currentStep - 1]}
                </Text>
              </View>
            </View>

            {onClose && (
              <TouchableOpacity
                style={[styles.navIconBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Step Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: theme.cardBorder }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.primary,
                  width: `${(currentStep / TOTAL_STEPS) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Step Content Body */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= STEP 1: BASIC INFO ================= */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIntro}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Chào bạn! Hãy cho AI biết thông tin cơ bản
                  </Text>
                  <Text style={[styles.questionSubtitle, { color: theme.textSecondary }]}>
                    Thông tin này giúp tính toán chính xác nhu cầu chuyển hóa năng lượng theo giới tính.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tên gọi của bạn:</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <Ionicons name="person-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Giới tính sinh học:</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity
                      style={[
                        styles.genderCard,
                        gender === 'male'
                          ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                          : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                      ]}
                      onPress={() => setGender('male')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.genderIconCircle, { backgroundColor: gender === 'male' ? theme.primary : theme.cardBorder }]}>
                        <Ionicons name="male" size={24} color="#ffffff" />
                      </View>
                      <Text style={[styles.genderTitle, { color: gender === 'male' ? theme.primary : theme.text }]}>
                        Nam giới
                      </Text>
                      <Text style={[styles.genderSub, { color: theme.textSecondary }]}>Chỉ số BMR cao hơn ~5-10%</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.genderCard,
                        gender === 'female'
                          ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                          : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                      ]}
                      onPress={() => setGender('female')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.genderIconCircle, { backgroundColor: gender === 'female' ? theme.primary : theme.cardBorder }]}>
                        <Ionicons name="female" size={24} color="#ffffff" />
                      </View>
                      <Text style={[styles.genderTitle, { color: gender === 'female' ? theme.primary : theme.text }]}>
                        Nữ giới
                      </Text>
                      <Text style={[styles.genderSub, { color: theme.textSecondary }]}>Tối ưu theo cấu trúc nữ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ================= STEP 2: BODY BIOMETRICS ================= */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIntro}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Số đo thể trạng của bạn
                  </Text>
                  <Text style={[styles.questionSubtitle, { color: theme.textSecondary }]}>
                    Dựa vào tuổi, chiều cao và cân nặng để tính toán chỉ số BMI và năng lượng nền BMR.
                  </Text>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Tuổi</Text>
                    <TextInput
                      style={[styles.bigMetricInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      placeholder="25"
                      placeholderTextColor={theme.textMuted}
                    />
                    <Text style={[styles.metricUnit, { color: theme.textMuted }]}>năm</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Chiều cao</Text>
                    <TextInput
                      style={[styles.bigMetricInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                      value={height}
                      onChangeText={setHeight}
                      keyboardType="numeric"
                      placeholder="170"
                      placeholderTextColor={theme.textMuted}
                    />
                    <Text style={[styles.metricUnit, { color: theme.textMuted }]}>cm</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Cân nặng</Text>
                    <TextInput
                      style={[styles.bigMetricInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="numeric"
                      placeholder="65"
                      placeholderTextColor={theme.textMuted}
                    />
                    <Text style={[styles.metricUnit, { color: theme.textMuted }]}>kg</Text>
                  </View>
                </View>

                {/* Real-time Indicator Box */}
                <View style={[styles.liveIndicatorBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <View style={styles.liveIndicatorRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.liveIndicatorTitle, { color: theme.textMuted }]}>Chỉ số khối BMI:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={[styles.liveBmiVal, { color: bmiColor }]}>{bmi}</Text>
                        <View style={[styles.bmiBadge, { backgroundColor: bmiColor + '20' }]}>
                          <Text style={[styles.bmiBadgeText, { color: bmiColor }]}>{bmiCategory}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.vertDivider, { backgroundColor: theme.cardBorder }]} />

                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Text style={[styles.liveIndicatorTitle, { color: theme.textMuted }]}>BMR Năng lượng nền:</Text>
                      <Text style={[styles.liveBmrVal, { color: theme.primary }]}>
                        {liveBMR} <Text style={{ fontSize: 12, color: theme.textMuted }}>kcal/ngày</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ================= STEP 3: ACTIVITY LEVEL ================= */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIntro}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Mức độ vận động hàng ngày
                  </Text>
                  <Text style={[styles.questionSubtitle, { color: theme.textSecondary }]}>
                    Chọn mức độ hoạt động thể chất gần nhất với lối sống hiện tại của bạn.
                  </Text>
                </View>

                <View style={styles.optionsList}>
                  {ACTIVITY_OPTIONS.map((item) => {
                    const isSelected = activityLevel === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.optionCard,
                          isSelected
                            ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                            : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                        ]}
                        onPress={() => setActivityLevel(item.id)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.optionIconBox,
                            {
                              backgroundColor: isSelected ? theme.primary : theme.card,
                              borderColor: isSelected ? theme.primary : theme.cardBorder,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon}
                            size={22}
                            color={isSelected ? '#ffffff' : theme.textSecondary}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.optionTitle,
                                { color: isSelected ? theme.primary : theme.text },
                                isSelected && { fontWeight: '800' },
                              ]}
                            >
                              {item.title}
                            </Text>
                            <View style={[styles.badgePill, { backgroundColor: isSelected ? theme.primary + '25' : theme.cardBorder }]}>
                              <Text style={[styles.badgeText, { color: isSelected ? theme.primary : theme.textMuted }]}>
                                {item.badge}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                            {item.desc}
                          </Text>
                        </View>

                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isSelected ? theme.primary : theme.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ================= STEP 4: FITNESS GOAL ================= */}
            {currentStep === 4 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIntro}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Mục tiêu thể hình & cân nặng
                  </Text>
                  <Text style={[styles.questionSubtitle, { color: theme.textSecondary }]}>
                    Bạn muốn giảm mỡ, giữ cân khỏe mạnh hay tăng cơ bắp?
                  </Text>
                </View>

                <View style={styles.optionsList}>
                  {GOAL_OPTIONS.map((item) => {
                    const isSelected = goal === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.optionCard,
                          isSelected
                            ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                            : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                        ]}
                        onPress={() => setGoal(item.id)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.optionIconBox,
                            {
                              backgroundColor: isSelected ? theme.primary : theme.card,
                              borderColor: isSelected ? theme.primary : theme.cardBorder,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon}
                            size={22}
                            color={isSelected ? '#ffffff' : theme.textSecondary}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.optionTitle,
                                { color: isSelected ? theme.primary : theme.text },
                                isSelected && { fontWeight: '800' },
                              ]}
                            >
                              {item.title}
                            </Text>
                            <View style={[styles.badgePill, { backgroundColor: item.badgeColor + '20' }]}>
                              <Text style={[styles.badgeText, { color: item.badgeColor }]}>
                                {item.badge}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                            {item.desc}
                          </Text>
                        </View>

                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isSelected ? theme.primary : theme.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ================= STEP 5: FINAL SUMMARY ================= */}
            {currentStep === 5 && (
              <View style={styles.stepContainer}>
                <View style={styles.stepIntro}>
                  <Text style={[styles.questionTitle, { color: theme.text }]}>
                    Kế hoạch dinh dưỡng cá nhân hóa
                  </Text>
                  <Text style={[styles.questionSubtitle, { color: theme.textSecondary }]}>
                    Dựa trên số đo và mục tiêu, AI đã tính toán chính xác khẩu phần dinh dưỡng hàng ngày của bạn:
                  </Text>
                </View>

                {/* Big Target Calories Display Card */}
                <View style={[styles.heroSummaryCard, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                  <Text style={[styles.heroTargetLabel, { color: theme.primary }]}>MỤC TIÊU NĂNG LƯỢNG MỖI NGÀY</Text>
                  <View style={styles.heroCalRow}>
                    <Text style={[styles.heroCalNum, { color: theme.primary }]}>
                      {calculatedTargets.targetCalories}
                    </Text>
                    <Text style={[styles.heroCalUnit, { color: theme.textSecondary }]}>kcal / ngày</Text>
                  </View>
                  <Text style={[styles.heroSubDesc, { color: theme.textSecondary }]}>
                    TDEE tiêu hao: {liveTDEE} kcal • BMR nền: {liveBMR} kcal
                  </Text>
                </View>

                {/* Macro Nutrients Breakdown Grid */}
                <View style={styles.macrosBreakdownGrid}>
                  <View style={[styles.macroBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <View style={[styles.macroDot, { backgroundColor: theme.protein }]} />
                    <Text style={[styles.macroBoxName, { color: theme.textSecondary }]}>Đạm (Protein)</Text>
                    <Text style={[styles.macroBoxVal, { color: theme.protein }]}>{calculatedTargets.targetProtein}g</Text>
                    <Text style={[styles.macroBoxSub, { color: theme.textMuted }]}>
                      ~{calculatedTargets.targetProtein * 4} kcal
                    </Text>
                  </View>

                  <View style={[styles.macroBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <View style={[styles.macroDot, { backgroundColor: theme.carbs }]} />
                    <Text style={[styles.macroBoxName, { color: theme.textSecondary }]}>Tinh bột (Carbs)</Text>
                    <Text style={[styles.macroBoxVal, { color: theme.carbs }]}>{calculatedTargets.targetCarbs}g</Text>
                    <Text style={[styles.macroBoxSub, { color: theme.textMuted }]}>
                      ~{calculatedTargets.targetCarbs * 4} kcal
                    </Text>
                  </View>

                  <View style={[styles.macroBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <View style={[styles.macroDot, { backgroundColor: theme.fat }]} />
                    <Text style={[styles.macroBoxName, { color: theme.fat }]}>Chất béo (Fat)</Text>
                    <Text style={[styles.macroBoxVal, { color: theme.fat }]}>{calculatedTargets.targetFat}g</Text>
                    <Text style={[styles.macroBoxSub, { color: theme.textMuted }]}>
                      ~{calculatedTargets.targetFat * 9} kcal
                    </Text>
                  </View>

                  <View style={[styles.macroBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <View style={[styles.macroDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={[styles.macroBoxName, { color: theme.textSecondary }]}>Nước uống</Text>
                    <Text style={[styles.macroBoxVal, { color: '#3b82f6' }]}>{calculatedTargets.waterGoal}ml</Text>
                    <Text style={[styles.macroBoxSub, { color: theme.textMuted }]}>~8-10 ly nước</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={[styles.wizardFooter, { borderTopColor: theme.cardBorder, backgroundColor: theme.card }]}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.footerBackBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={theme.text} />
                <Text style={[styles.footerBackText, { color: theme.text }]}>Quay lại</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.footerNextBtn, { backgroundColor: theme.primary }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.footerNextText}>
                {currentStep === TOTAL_STEPS ? 'Bắt Đầu Tính Calo' : 'Tiếp Tục'}
              </Text>
              <Ionicons
                name={currentStep === TOTAL_STEPS ? 'checkmark-circle' : 'arrow-forward'}
                size={18}
                color="#ffffff"
              />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
        display: 'flex' as any,
      },
    }),
  },
  modalWrapper: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  wizardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDotPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCountText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepTitleHeader: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  stepContainer: {
    gap: 18,
  },
  stepIntro: {
    gap: 6,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  questionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  genderIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  genderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  genderSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  bigMetricInput: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveIndicatorBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicatorTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  liveBmiVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  bmiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  vertDivider: {
    width: 1,
    height: 38,
  },
  liveBmrVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  heroSummaryCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  heroTargetLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroCalNum: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroCalUnit: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroSubDesc: {
    fontSize: 11,
    fontWeight: '600',
  },
  macrosBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  macroBox: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroBoxName: {
    fontSize: 11,
    fontWeight: '700',
  },
  macroBoxVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  macroBoxSub: {
    fontSize: 10,
  },
  wizardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  footerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  footerBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  footerNextText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
