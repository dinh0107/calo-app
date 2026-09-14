export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MacroNutrients {
  calories: number; // kcal
  protein: number;  // g
  carbs: number;    // g
  fat: number;      // g
  fiber?: number;   // g
  sugar?: number;   // g
  sodium?: number;  // mg
}

export interface IngredientItem {
  id?: string;
  name: string;
  weight: number;    // in grams
  calories: number;  // in kcal
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  vietnameseName?: string;
  imageUrl?: string;
  portionSize: number; // e.g. 350
  portionUnit: string; // e.g. 'phần (350g)', 'bát', 'đĩa', 'ly'
  macros: MacroNutrients;
  ingredients: IngredientItem[];
  healthScore: number; // 1 to 100
  nutritionTip: string;
  confidence: number;  // 0 to 100 percentage
  category: 'món_nước' | 'món_cơm' | 'món_bánh' | 'đồ_uống' | 'ăn_vặt' | 'salad' | 'món_âu' | 'khác';
}

export interface MealEntry {
  id: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm
  mealType: MealType;
  food: FoodItem;
  notes?: string;
  createdAt: number;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose_weight_fast' | 'lose_weight' | 'maintain' | 'gain_weight' | 'gain_muscle';

export interface UserProfile {
  name: string;
  gender: 'male' | 'female';
  age: number;
  weight: number; // kg
  height: number; // cm
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterGoal: number; // ml
  geminiApiKey?: string;
  hasCompletedOnboarding?: boolean;
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  waterIntake: number;
  entries: MealEntry[];
}
