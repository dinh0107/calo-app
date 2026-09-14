import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealEntry, UserProfile } from '../types/food';
import { DEFAULT_USER_PROFILE } from './authService';

const STORAGE_KEYS = {
  MEALS: 'calovision_meals_real_v2',
  PROFILE: 'calovision_profile_real_v2',
  WATER: 'calovision_water_real_v2',
};

// In-memory cache for synchronous reads with 100% CLEAN EMPTY initial state
let memoryCache: {
  meals: MealEntry[];
  profile: UserProfile;
  water: Record<string, number>;
} = {
  meals: [],
  profile: DEFAULT_USER_PROFILE,
  water: {},
};

export const storageService = {
  async init(): Promise<void> {
    try {
      const [storedMeals, storedProfile, storedWater] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MEALS),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.WATER),
      ]);

      if (storedMeals) {
        memoryCache.meals = JSON.parse(storedMeals);
      } else {
        memoryCache.meals = [];
        await AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([]));
      }

      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        memoryCache.profile = {
          ...DEFAULT_USER_PROFILE,
          ...parsed,
          geminiApiKey: parsed.geminiApiKey || DEFAULT_USER_PROFILE.geminiApiKey,
        };
      }

      if (storedWater) {
        memoryCache.water = JSON.parse(storedWater);
      } else {
        memoryCache.water = {};
      }
    } catch (e) {
      console.warn('Storage init error:', e);
    }
  },

  getMeals(): MealEntry[] {
    return memoryCache.meals;
  },

  async saveMeals(meals: MealEntry[]): Promise<void> {
    memoryCache.meals = meals;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    } catch (e) {
      console.warn('Failed to save meals:', e);
    }
  },

  getProfile(): UserProfile {
    return memoryCache.profile;
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    memoryCache.profile = profile;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile:', e);
    }
  },

  getWaterLogs(): Record<string, number> {
    return memoryCache.water;
  },

  async saveWaterLogs(logs: Record<string, number>): Promise<void> {
    memoryCache.water = logs;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WATER, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to save water logs:', e);
    }
  },

  async clearAllMeals(): Promise<void> {
    memoryCache.meals = [];
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear meals:', e);
    }
  },

  async resetToDefault(): Promise<void> {
    memoryCache.meals = [];
    memoryCache.profile = DEFAULT_USER_PROFILE;
    memoryCache.water = {};
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.MEALS, STORAGE_KEYS.PROFILE, STORAGE_KEYS.WATER]);
    } catch (e) {
      console.warn('Reset error:', e);
    }
  },
};
