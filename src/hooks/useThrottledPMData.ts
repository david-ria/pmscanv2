import { useState, useEffect, useRef } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { throttle } from '@/utils/performance';

/**
 * Hook to throttle PM data updates for better performance
 * Reduces re-renders and CPU usage for real-time PM displays
 */
export function useThrottledPMData(
  currentData: PMScanData | null,
  throttleMs: number = 500
) {
  const [throttledData, setThrottledData] = useState<PMScanData | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Create a throttled update function
  const throttledUpdate = useRef(
    throttle((data: PMScanData | null) => {
      setThrottledData(data);
    }, throttleMs)
  );

  useEffect(() => {
    if (!currentData) {
      setThrottledData(null);
      return;
    }

    // Skip update if data hasn't changed significantly
    if (throttledData) {
      const hasSignificantChange = 
        Math.abs(currentData.pm25 - throttledData.pm25) >= 1 ||
        Math.abs(currentData.pm1 - throttledData.pm1) >= 1 ||
        Math.abs(currentData.pm10 - throttledData.pm10) >= 1;
      
      if (!hasSignificantChange) {
        return; // Skip insignificant updates
      }
    }

    throttledUpdate.current(currentData);
  }, [currentData, throttledData]);

  return throttledData;
}