/**
 * Hook for deferred component initialization
 * Use this to defer heavy initialization logic in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDeferredInitOptions {
  /**
   * Delay before initialization (ms)
   * @default 0 - use requestIdleCallback only
   */
  delay?: number;
  
  /**
   * Timeout for requestIdleCallback (ms)
   * @default 2000
   */
  timeout?: number;
  
  /**
   * Priority level affects scheduling
   * @default 'low'
   */
  priority?: 'low' | 'medium' | 'high';
  
  /**
   * Whether to automatically start on mount
   * @default true
   */
  autoStart?: boolean;
}

export function useDeferredInit(
  initFunction: () => void | Promise<void>,
  options: UseDeferredInitOptions = {}
) {
  const {
    delay = 0,
    timeout = 2000,
    priority = 'low',
    autoStart = true
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  const executeInit = useCallback(async () => {
    if (initRef.current) return;
    
    initRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await initFunction();
      setIsInitialized(true);
    } catch (err) {
      setError(err as Error);
      console.error('[PERF] Deferred initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initFunction]);

  const scheduleInit = useCallback(() => {
    const priorityDelay = priority === 'high' ? 0 : priority === 'medium' ? 50 : 100;
    const totalDelay = Math.max(delay, priorityDelay);

    if ('requestIdleCallback' in window && priority !== 'high') {
      // Use requestIdleCallback for low/medium priority
      if (totalDelay > 0) {
        setTimeout(() => {
          requestIdleCallback(executeInit, { timeout });
        }, totalDelay);
      } else {
        requestIdleCallback(executeInit, { timeout });
      }
    } else {
      // Use setTimeout for high priority or browsers without requestIdleCallback
      setTimeout(executeInit, totalDelay);
    }
  }, [executeInit, delay, timeout, priority]);

  const manualInit = useCallback(() => {
    if (!initRef.current) {
      executeInit();
    }
  }, [executeInit]);

  const reset = useCallback(() => {
    initRef.current = false;
    setIsInitialized(false);
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoStart) {
      scheduleInit();
    }
  }, [scheduleInit, autoStart]);

  return {
    isInitialized,
    isLoading,
    error,
    init: manualInit,
    reset
  };
}

/**
 * Hook for deferring component renders based on viewport visibility
 */
export function useDeferredRender(threshold = 0.1) {
  const [shouldRender, setShouldRender] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If IntersectionObserver is not available, render immediately
    if (!('IntersectionObserver' in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, shouldRender };
}

/**
 * Hook for batching state updates during deferred initialization
 */
export function useDeferredState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const batchedUpdates = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setBatchedState = useCallback((update: Partial<T>) => {
    batchedUpdates.current.push(update);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule batched update
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (batchedUpdates.current.length > 0) {
          setState(prev => ({ 
            ...prev, 
            ...batchedUpdates.current.reduce((acc, update) => ({ ...acc, ...update }), {})
          }));
          batchedUpdates.current = [];
        }
      }, { timeout: 100 });
    } else {
      timeoutRef.current = setTimeout(() => {
        if (batchedUpdates.current.length > 0) {
          setState(prev => ({ 
            ...prev, 
            ...batchedUpdates.current.reduce((acc, update) => ({ ...acc, ...update }), {})
          }));
          batchedUpdates.current = [];
        }
      }, 16); // ~60fps
    }
  }, []);

  return [state, setBatchedState] as const;
}