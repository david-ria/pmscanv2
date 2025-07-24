import { debounce } from './performance';

/**
 * Performance optimizations specifically for the application
 */

// Debounced data processing for large datasets
export const createDebouncedDataProcessor = <T>(
  processor: (data: T[]) => any,
  delay: number = 300
) => {
  return debounce(processor, delay);
};

// Virtual scrolling for large lists
export const getVisibleItems = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex),
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight
  };
};

// Memoization for expensive calculations
const memoCache = new Map();

export const memoizeExpensiveOperation = <T, R>(
  operation: (input: T) => R,
  keyGenerator: (input: T) => string
) => {
  return (input: T): R => {
    const key = keyGenerator(input);
    if (memoCache.has(key)) {
      return memoCache.get(key);
    }
    
    const result = operation(input);
    memoCache.set(key, result);
    
    // Limit cache size
    if (memoCache.size > 100) {
      const firstKey = memoCache.keys().next().value;
      memoCache.delete(firstKey);
    }
    
    return result;
  };
};

// Optimize chart data for better performance
export const optimizeChartData = (data: any[], maxPoints: number = 500) => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

// Preload critical chunks
export const preloadCriticalChunks = () => {
  if (typeof window !== 'undefined') {
    // Preload analysis components after page load
    requestIdleCallback(() => {
      import('@/components/Analysis/PollutionBreakdown/index');
      import('@/components/Analysis/StatisticalAnalysis');
    }, { timeout: 2000 });
  }
};