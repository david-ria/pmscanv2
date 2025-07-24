import React from 'react';

/**
 * Performance optimization utilities
 */

// Debounce function for expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for frequent events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Lazy load components with intersection observer
export const createLazyComponent = (importFn: () => Promise<any>) => {
  return React.lazy(() => {
    return new Promise((resolve) => {
      // Add artificial delay for non-critical components in development
      const delay = import.meta.env.DEV ? 0 : 100;
      setTimeout(() => {
        importFn().then(resolve);
      }, delay);
    });
  });
};

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

// Mark performance metrics
export const markPerformance = (name: string) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(name);
  }
};

// Measure performance between marks
export const measurePerformance = (name: string, startMark: string, endMark: string) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      console.debug(`Performance ${name}: ${measure.duration.toFixed(2)}ms`);
      return measure.duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }
  return 0;
};

// Check if device has limited resources
export const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  
  // Check device memory if available
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) return true;
  
  // Check hardware concurrency
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;
  
  // Check connection
  const connection = (navigator as any).connection;
  if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
    return true;
  }
  
  return false;
};

// Optimize images based on device capabilities
export const getOptimalImageSize = (baseSize: number) => {
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const isLowEnd = isLowEndDevice();
  
  if (isLowEnd) {
    return Math.floor(baseSize * 0.75); // Reduce by 25% for low-end devices
  }
  
  return Math.floor(baseSize * Math.min(pixelRatio, 2)); // Cap at 2x for performance
};