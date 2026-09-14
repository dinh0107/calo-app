import type { ActivityLevel, FitnessGoal } from '../types/food';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; desc: string; factor: number }> = {
  sedentary: {
    label: 'Ít vận động',
    desc: 'Làm việc văn phòng, ít hoặc không tập thể dục',
    factor: 1.2,
  },
  light: {
    label: 'Vận động nhẹ',
    desc: 'Tập thể dục nhẹ 1-3 ngày/tuần',
    factor: 1.375,
  },
  moderate: {
    label: 'Vận động vừa phải',
    desc: 'Tập thể dục thể thao 3-5 ngày/tuần',
    factor: 1.55,
  },
  active: {
    label: 'Năng động nhiều',
    desc: 'Tập luyện cường độ cao 6-7 ngày/tuần',
    factor: 1.725,
  },
  very_active: {
    label: 'Vận động viên / Lao động nặng',
    desc: 'Tập 2 buổi/ngày hoặc công việc thể lực nặng',
    factor: 1.9,
  },
};

export const GOAL_CONFIG: Record<FitnessGoal, { label: string; desc: string; delta: number; proteinRatio: number; fatRatio: number; carbsRatio: number }> = {
  lose_weight_fast: {
    label: 'Giảm cân nhanh (-0.75kg/tuần)',
    desc: 'Thâm hụt calo cao (-700 kcal), giàu đạm để giữ cơ',
    delta: -700,
    proteinRatio: 0.35,
    fatRatio: 0.25,
    carbsRatio: 0.40,
  },
  lose_weight: {
    label: 'Giảm mỡ an toàn (-0.5kg/tuần)',
    desc: 'Thâm hụt calo bền vững (-500 kcal), dễ duy trì',
    delta: -500,
    proteinRatio: 0.30,
    fatRatio: 0.25,
    carbsRatio: 0.45,
  },
  maintain: {
    label: 'Giữ cân & Cải thiện vóc dáng',
    desc: 'Duy trì mức calo cân bằng (TDEE chuẩn)',
    delta: 0,
    proteinRatio: 0.25,
    fatRatio: 0.25,
    carbsRatio: 0.50,
  },
  gain_muscle: {
    label: 'Tăng cơ nạc (Lean Bulk)',
    desc: 'Thặng dư calo nhẹ (+250 kcal), tập trung đạm',
    delta: 250,
    proteinRatio: 0.30,
    fatRatio: 0.25,
    carbsRatio: 0.45,
  },
  gain_weight: {
    label: 'Tăng cân & Tăng cơ (+0.5kg/tuần)',
    desc: 'Thặng dư calo (+500 kcal) cho người gầy',
    delta: 500,
    proteinRatio: 0.25,
    fatRatio: 0.25,
    carbsRatio: 0.50,
  },
};

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor formula
 */
export function calculateBMR(gender: 'male' | 'female', weightKg: number, heightCm: number, age: number): number {
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const factor = ACTIVITY_MULTIPLIERS[activityLevel]?.factor || 1.375;
  return Math.round(bmr * factor);
}

/**
 * Calculate Recommended Targets (Calories, Protein, Carbs, Fat, Water)
 */
export function calculateNutritionTargets(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: FitnessGoal
) {
  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);
  const goalConfig = GOAL_CONFIG[goal];

  const targetCalories = Math.max(1200, tdee + goalConfig.delta);

  // Calculate macros in grams (1g protein = 4 kcal, 1g carb = 4 kcal, 1g fat = 9 kcal)
  const targetProtein = Math.round((targetCalories * goalConfig.proteinRatio) / 4);
  const targetFat = Math.round((targetCalories * goalConfig.fatRatio) / 9);
  const targetCarbs = Math.round((targetCalories * goalConfig.carbsRatio) / 4);

  // Recommended daily water (ml)
  const waterGoal = Math.round(weightKg * 35);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    waterGoal,
  };
}
