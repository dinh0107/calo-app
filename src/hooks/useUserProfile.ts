import { useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '../types/food';
import { storageService } from '../services/storageService';
import { calculateNutritionTargets } from '../utils/nutritionCalculators';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => storageService.getProfile());

  useEffect(() => {
    storageService.init().then(() => {
      setProfile(storageService.getProfile());
    });
  }, []);

  const updateProfile = useCallback((partial: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...partial };
      if (
        partial.weight !== undefined ||
        partial.height !== undefined ||
        partial.age !== undefined ||
        partial.gender !== undefined ||
        partial.activityLevel !== undefined ||
        partial.goal !== undefined
      ) {
        const targets = calculateNutritionTargets(
          updated.gender,
          updated.weight,
          updated.height,
          updated.age,
          updated.activityLevel,
          updated.goal
        );
        updated.targetCalories = targets.targetCalories;
        updated.targetProtein = targets.targetProtein;
        updated.targetCarbs = targets.targetCarbs;
        updated.targetFat = targets.targetFat;
        updated.waterGoal = targets.waterGoal;
      }
      storageService.saveProfile(updated);
      return updated;
    });
  }, []);

  const setApiKey = useCallback((key: string) => {
    updateProfile({ geminiApiKey: key.trim() });
  }, [updateProfile]);

  return {
    profile,
    updateProfile,
    setApiKey,
    reloadProfile: () => setProfile(storageService.getProfile()),
  };
}
