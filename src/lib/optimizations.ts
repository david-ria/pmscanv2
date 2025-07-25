import React from 'react';
// Global performance and UX optimizations
// Centralized utilities for better user experience and performance

/**
 * Performance-focused React Hook optimization
 * Consolidates common patterns to reduce bundle size and improve performance
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Optimized hook for stable callbacks that don't cause re-renders
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  // Return stable callback that calls current ref
  return useCallback(((...args: any[]) => {
    return callbackRef.current(...args);
  }) as T, []);
}

// Optimized hook for expensive computations with multiple dependencies
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  isExpensive = false
): T {
  // For expensive computations, add additional stability
  const lastDeps = useRef<React.DependencyList | undefined>();
  const lastResult = useRef<T>();
  
  return useMemo(() => {
    // For expensive operations, do shallow comparison of dependencies
    if (isExpensive && lastDeps.current && deps) {
      const depsChanged = deps.length !== lastDeps.current.length ||
        deps.some((dep, index) => dep !== lastDeps.current![index]);
      
      if (!depsChanged && lastResult.current !== undefined) {
        return lastResult.current;
      }
    }
    
    const result = factory();
    lastDeps.current = deps;
    lastResult.current = result;
    return result;
  }, deps);
}

// Optimized debounce hook for reducing unnecessary API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Performance monitoring hook for identifying bottlenecks
export function usePerformanceMonitor(componentName: string, enabled = false) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current++;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    if (timeSinceLastRender > 16.67) { // More than one frame
      console.warn(`[PERF] ${componentName} slow render: ${timeSinceLastRender.toFixed(2)}ms (render #${renderCount.current})`);
    }
    
    lastRenderTime.current = currentTime;
  });
}

// Intersection Observer hook for lazy loading optimization
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { elementRef, isIntersecting };
}

// Optimized local storage hook with performance considerations
export function useOptimizedLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    debounceMs?: number;
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    debounceMs = 300
  } = options;

  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const debouncedValue = useDebounce(value, debounceMs);

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(debouncedValue));
    } catch (error) {
      console.warn(`Failed to save to localStorage for key "${key}":`, error);
    }
  }, [key, debouncedValue, serialize]);

  return [value, setValue] as const;
}

/**
 * Utility class names for consistent styling
 * Reduces CSS duplication and ensures design system consistency
 */
export const optimizedStyles = {
  // Layout patterns
  grid: {
    responsive: 'content-grid',
    stable: 'grid gap-4 transition-all duration-200',
  },
  
  // Interactive elements
  interactive: {
    card: 'interactive-hover cursor-pointer transition-all duration-200',
    button: 'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
    subtle: 'transition-colors duration-200 hover:bg-muted/50',
  },
  
  // Loading states
  loading: {
    skeleton: 'skeleton-pulse rounded',
    spinner: 'animate-spin',
    fade: 'animate-fade-in',
  },
  
  // Air quality specific
  airQuality: {
    card: 'air-quality-card card-elevated',
    gradient: 'air-quality-gradient',
    status: 'px-3 py-1 rounded-full text-xs font-medium',
  },
  
  // Layout stability
  stable: {
    section: 'min-h-16 transition-all duration-300',
    content: 'layout-stable',
    recording: 'recording-section',
  }
} as const;

/**
 * Common animation variants for consistent UX
 */
export const animations = {
  // Entry animations
  fadeIn: 'animate-fade-in',
  scaleIn: 'animate-scale-in',
  slideIn: 'animate-slide-in-right',
  
  // Loading states
  pulse: 'animate-pulse-soft',
  slowPulse: 'animate-slow-pulse',
  
  // Interactive states
  hover: 'transition-transform duration-200 hover:scale-105',
  press: 'transition-all duration-150 active:scale-95',
} as const;

/**
 * Performance-optimized component wrapper
 * Adds common performance optimizations and monitoring
 */
export function withPerformanceOptimization<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  options: {
    enableMonitoring?: boolean;
    enableMemoization?: boolean;
  } = {}
) {
  const { enableMonitoring = false, enableMemoization = true } = options;
  
  const OptimizedComponent = (props: P) => {
    usePerformanceMonitor(componentName, enableMonitoring);
    
    return React.createElement(Component, props);
  };
  
  OptimizedComponent.displayName = `Optimized(${componentName})`;
  
  return enableMemoization 
    ? React.memo(OptimizedComponent)
    : OptimizedComponent;
}

/**
 * Accessibility utilities for better UX
 */
export const a11y = {
  // Screen reader utilities
  srOnly: 'sr-only',
  ariaLabel: (label: string) => ({ 'aria-label': label }),
  ariaDescribedBy: (id: string) => ({ 'aria-describedby': id }),
  
  // Focus management
  focusRing: 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  skipToContent: 'skip-to-content absolute -top-full left-4 z-50 px-4 py-2 bg-primary text-primary-foreground rounded focus:top-4',
  
  // Interactive states
  button: 'cursor-pointer focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  link: 'underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2',
} as const;

console.debug('[PERF] 🚀 Global performance optimizations loaded');