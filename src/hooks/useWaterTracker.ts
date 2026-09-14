import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

export function useWaterTracker(selectedDate: string) {
  const [waterLogs, setWaterLogs] = useState<Record<string, number>>(() =>
    storageService.getWaterLogs()
  );

  useEffect(() => {
    storageService.init().then(() => {
      setWaterLogs(storageService.getWaterLogs());
    });
  }, []);

  const currentWater = waterLogs[selectedDate] || 0;

  const addWater = useCallback((amountMl: number) => {
    setWaterLogs((prev) => {
      const updated = {
        ...prev,
        [selectedDate]: Math.max(0, (prev[selectedDate] || 0) + amountMl),
      };
      storageService.saveWaterLogs(updated);
      return updated;
    });
  }, [selectedDate]);

  const setWater = useCallback((amountMl: number) => {
    setWaterLogs((prev) => {
      const updated = {
        ...prev,
        [selectedDate]: Math.max(0, amountMl),
      };
      storageService.saveWaterLogs(updated);
      return updated;
    });
  }, [selectedDate]);

  const resetWater = useCallback(() => {
    setWaterLogs((prev) => {
      const updated = {
        ...prev,
        [selectedDate]: 0,
      };
      storageService.saveWaterLogs(updated);
      return updated;
    });
  }, [selectedDate]);

  return {
    currentWater,
    addWater,
    setWater,
    resetWater,
  };
}
