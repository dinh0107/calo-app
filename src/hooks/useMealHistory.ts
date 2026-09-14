import { useState, useEffect, useMemo, useCallback } from 'react';
import type { MealEntry, MealType } from '../types/food';
import { storageService } from '../services/storageService';
import { api } from '../services/apiClient';

export function useMealHistory() {
  const [meals, setMeals] = useState<MealEntry[]>(() => storageService.getMeals());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Fetch / Sync meals from backend and local storage
  const syncWithBackend = useCallback(async (date: string) => {
    try {
      const res = await api.meals.getByDate(date);
      if (res.success && res.data?.meals && res.data.meals.length > 0) {
        const backendEntries: MealEntry[] = [];
        res.data.meals.forEach((m: any) => {
          m.foodItems?.forEach((f: any) => {
            backendEntries.push({
              id: m.id,
              date: m.date,
              time: m.time,
              mealType: m.mealType as MealType,
              food: {
                id: f.id,
                name: f.name,
                vietnameseName: f.vietnameseName,
                portionSize: f.portionSize,
                portionUnit: f.portionUnit,
                category: 'khác',
                confidence: 95,
                healthScore: f.healthScore || 85,
                imageUrl: f.imageUrl,
                ingredients: [],
                nutritionTip: 'Món ăn dinh dưỡng đã ghi nhận.',
                macros: {
                  calories: f.calories,
                  protein: f.protein,
                  carbs: f.carbs,
                  fat: f.fat,
                  fiber: f.fiber,
                  sodium: f.sodium,
                },
              },
              notes: f.notes,
              createdAt: new Date(m.createdAt).getTime(),
            });
          });
        });

        if (backendEntries.length > 0) {
          setMeals((prev) => {
            const otherDates = prev.filter((item) => item.date !== date);
            const combined = [...backendEntries, ...otherDates];
            storageService.saveMeals(combined);
            return combined;
          });
        }
      }
    } catch {
      // Local mode fallback
    }
  }, []);

  useEffect(() => {
    storageService.init().then(() => {
      setMeals(storageService.getMeals());
      syncWithBackend(selectedDate);
    });
  }, [syncWithBackend, selectedDate]);

  const addMealEntry = useCallback(
    async (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => {
      const tempId = 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const newEntry: MealEntry = {
        ...entryData,
        id: tempId,
        createdAt: Date.now(),
      };

      // 1. Optimistic instant local update
      setMeals((prev) => {
        const updated = [newEntry, ...prev];
        storageService.saveMeals(updated);
        return updated;
      });

      // 2. Sync to backend in background
      try {
        const apiRes = await api.meals.add({
          mealType: entryData.mealType,
          date: entryData.date,
          time: entryData.time,
          food: entryData.food,
        });

        if (apiRes.success && apiRes.data?.id) {
          const backendId = apiRes.data.id;
          setMeals((prev) => {
            const synced = prev.map((m) => (m.id === tempId ? { ...m, id: backendId } : m));
            storageService.saveMeals(synced);
            return synced;
          });
        }
      } catch (e) {
        console.warn('Backend addMeal notice:', e);
      }

      return newEntry;
    },
    []
  );

  const updateMealEntry = useCallback((id: string, updated: Partial<MealEntry>) => {
    setMeals((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updated } : item));
      storageService.saveMeals(next);
      return next;
    });
  }, []);

  const deleteMealEntry = useCallback(async (id: string) => {
    setMeals((prev) => {
      const next = prev.filter((item) => item.id !== id);
      storageService.saveMeals(next);
      return next;
    });

    try {
      await api.meals.delete(id);
    } catch (e) {
      console.warn('Backend deleteMeal notice:', e);
    }
  }, []);

  const duplicateMealEntry = useCallback(
    async (id: string, targetDate?: string) => {
      const existing = meals.find((m) => m.id === id);
      if (!existing) return;
      const newDate = targetDate || selectedDate;
      const duplicated: MealEntry = {
        ...existing,
        id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: newDate,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
      };

      setMeals((prev) => {
        const next = [duplicated, ...prev];
        storageService.saveMeals(next);
        return next;
      });

      try {
        await api.meals.duplicate(id, newDate);
      } catch (e) {
        console.warn('Backend duplicateMeal notice:', e);
      }
    },
    [meals, selectedDate]
  );

  const selectedDateMeals = useMemo(() => {
    return meals.filter((m) => m.date === selectedDate);
  }, [meals, selectedDate]);

  const dailyTotals = useMemo(() => {
    return selectedDateMeals.reduce(
      (acc, item) => {
        acc.calories += item.food.macros.calories || 0;
        acc.protein += item.food.macros.protein || 0;
        acc.carbs += item.food.macros.carbs || 0;
        acc.fat += item.food.macros.fat || 0;
        acc.fiber = (acc.fiber || 0) + (item.food.macros.fiber || 0);
        acc.sodium = (acc.sodium || 0) + (item.food.macros.sodium || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
    );
  }, [selectedDateMeals]);

  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, { entries: MealEntry[]; totalCalories: number }> = {
      breakfast: { entries: [], totalCalories: 0 },
      lunch: { entries: [], totalCalories: 0 },
      dinner: { entries: [], totalCalories: 0 },
      snack: { entries: [], totalCalories: 0 },
    };

    selectedDateMeals.forEach((item) => {
      if (grouped[item.mealType]) {
        grouped[item.mealType].entries.push(item);
        grouped[item.mealType].totalCalories += item.food.macros.calories || 0;
      }
    });

    return grouped;
  }, [selectedDateMeals]);

  const getPastDaysTrend = (days = 7) => {
    const result: { date: string; label: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMeals = meals.filter((m) => m.date === dateStr);

      const dayTotal = dayMeals.reduce(
        (acc, item) => {
          acc.calories += item.food.macros.calories || 0;
          acc.protein += item.food.macros.protein || 0;
          acc.carbs += item.food.macros.carbs || 0;
          acc.fat += item.food.macros.fat || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const label =
        i === 0
          ? 'Hôm nay'
          : i === 1
          ? 'Hôm qua'
          : `${d.getDate()}/${d.getMonth() + 1}`;

      result.push({
        date: dateStr,
        label,
        ...dayTotal,
      });
    }

    return result;
  };

  const clearAllMeals = useCallback(async () => {
    await storageService.clearAllMeals();
    setMeals([]);
    try {
      await api.meals.clearAll();
    } catch {}
  }, []);

  return {
    meals,
    selectedDate,
    setSelectedDate,
    selectedDateMeals,
    dailyTotals,
    mealsByType,
    addMealEntry,
    updateMealEntry,
    deleteMealEntry,
    duplicateMealEntry,
    getPastDaysTrend,
    clearAllMeals,
    reloadMeals: () => setMeals(storageService.getMeals()),
  };
}
