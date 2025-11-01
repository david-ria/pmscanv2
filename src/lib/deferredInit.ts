/**
 * Deferred initialization manager
 * Handles non-essential initialization after critical rendering
 */

import { isTestMode, logTestModeDisabled } from '@/utils/testMode';

interface DeferredTask {
  name: string;
  priority: 'low' | 'medium' | 'high';
  task: () => void | Promise<void>;
  timeout?: number;
}

class DeferredInitializer {
  private tasks: DeferredTask[] = [];
  private executed: Set<string> = new Set();
  private isInitialized = false;

  /**
   * Add a task to be executed when browser is idle
   */
  addTask(task: DeferredTask) {
    if (this.executed.has(task.name)) {
      return;
    }
    
    this.tasks.push(task);
    
    if (this.isInitialized) {
      this.executeTask(task);
    }
  }

  /**
   * Start deferred initialization
   */
  start() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    console.debug('[PERF] Starting deferred initialization...');
    
    // Sort tasks by priority
    const sortedTasks = [...this.tasks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Execute tasks in priority order
    sortedTasks.forEach(task => this.executeTask(task));
  }

  /**
   * Execute a single task with appropriate scheduling
   */
  private executeTask(task: DeferredTask) {
    if (this.executed.has(task.name)) {
      return;
    }

    const executeTaskWork = async () => {
      try {
        console.debug(`[PERF] Executing deferred task: ${task.name}`);
        await task.task();
        console.debug(`[PERF] Completed deferred task: ${task.name}`);
      } catch (error) {
        console.error(`[PERF] Failed deferred task: ${task.name}`, error);
      } finally {
        this.executed.add(task.name);
      }
    };

    // Use requestIdleCallback for non-critical tasks
    if ('requestIdleCallback' in window) {
      requestIdleCallback(executeTaskWork, { 
        timeout: task.timeout || (task.priority === 'high' ? 1000 : 3000)
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      const delay = task.priority === 'high' ? 0 : task.priority === 'medium' ? 50 : 100;
      setTimeout(executeTaskWork, delay);
    }
  }

  /**
   * Check if a task has been executed
   */
  isTaskExecuted(name: string): boolean {
    return this.executed.has(name);
  }
}

// Global deferred initializer instance
export const deferredInit = new DeferredInitializer();

/**
 * Defer analytics initialization
 */
export const initAnalytics = () => {
  deferredInit.addTask({
    name: 'analytics',
    priority: 'low',
    task: async () => {
      // Future: Initialize analytics SDK
      // const analytics = await import('analytics-lib');
      // analytics.init({ ... });
      console.debug('[PERF] Analytics initialized (placeholder)');
    },
    timeout: 5000
  });
};

/**
 * Defer charts initialization  
 */
export const initCharts = () => {
  deferredInit.addTask({
    name: 'charts',
    priority: 'medium',
    task: async () => {
      // Preload chart library for faster access when needed
      const { loadChartLibrary } = await import('@/lib/dynamicImports');
      await loadChartLibrary();
      console.debug('[PERF] Charts library preloaded');
    },
    timeout: 2000
  });
};

/**
 * Defer Bluetooth initialization
 */
export const initBluetooth = () => {
  deferredInit.addTask({
    name: 'bluetooth',
    priority: 'medium',
    task: async () => {
      // Check if bluetooth is available and preload library
      if ('bluetooth' in navigator) {
        const { loadBluetoothLE } = await import('@/lib/dynamicImports');
        await loadBluetoothLE();
        console.debug('[PERF] Bluetooth library preloaded');
      }
    },
    timeout: 2000
  });
};

/**
 * Defer map initialization
 */
export const initMap = () => {
  deferredInit.addTask({
    name: 'map',
    priority: 'low',
    task: async () => {
      // Preload map resources when idle
      const { loadMapboxGL } = await import('@/lib/dynamicImports');
      await loadMapboxGL();
      console.debug('[PERF] Map library preloaded');
    },
    timeout: 3000
  });
};

/**
 * Defer service worker registration - Manual registration approach
 */
export const initServiceWorker = () => {
  deferredInit.addTask({
    name: 'service-worker',
    priority: 'high',
    task: async () => {
      if (isTestMode()) {
        logTestModeDisabled('Service Worker registration (deferred)');
        return;
      }
      
      if (!('serviceWorker' in navigator)) {
        console.warn('[PWA] Service Workers not supported in this browser');
        return;
      }
      
      try {
        // Detect if we're on Lovable preview or local dev
        const isLovablePreview = window.location.hostname.includes('lovable.app') || 
                                 window.location.hostname.includes('lovableproject.com');
        const isDev = import.meta.env.DEV || isLovablePreview;

        if (isDev) {
          // DEV or Lovable: Use virtual module for dev-sw
          const { registerSW } = await import('virtual:pwa-register');
          registerSW({
            immediate: true,
            onRegistered(reg) {
              console.debug('[PWA][DEV] SW registered:', { 
                scope: reg?.scope, 
                dev: true,
                lovable: isLovablePreview 
              });
            },
            onRegisterError(error) {
              console.error('[PWA][DEV] SW registration failed:', error);
            }
          });
        } else {
          // PROD: Manual registration with module type
          const registration = await navigator.serviceWorker.register('/sw.js', {
            type: 'module',
            scope: '/'
          });
          
          console.debug('[PWA][PROD] SW registered:', {
            scope: registration.scope,
            active: !!registration.active
          });
          
          await navigator.serviceWorker.ready;
          console.debug('[PWA][PROD] SW ready and active');
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.debug('[PWA] New content available, please refresh');
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    },
    timeout: 2000
  });
};

/**
 * Defer error reporting initialization
 */
export const initErrorReporting = () => {
  deferredInit.addTask({
    name: 'error-reporting',
    priority: 'medium',
    task: () => {
      // Setup global error handlers
      window.addEventListener('error', (event) => {
        console.error('[ERROR] Global error:', event.error);
        // Future: Send to error reporting service
      });

      window.addEventListener('unhandledrejection', (event) => {
        console.error('[ERROR] Unhandled promise rejection:', event.reason);
        // Future: Send to error reporting service
      });
      
      console.debug('[PERF] Error reporting initialized');
    },
    timeout: 1000
  });
};

/**
 * Initialize main thread optimizer
 */
export const initMainThreadOptimizer = () => {
  deferredInit.addTask({
    name: 'main-thread-optimizer',
    priority: 'high',
    task: async () => {
      // Load optimizer immediately for critical performance
      await import('@/lib/mainThreadOptimizer');
      console.debug('[PERF] Main Thread Optimizer loaded');
    },
    timeout: 500
  });
};

/**
 * Initialize all non-critical features
 */
export const initNonEssentialFeatures = () => {
  console.debug('[PERF] Scheduling non-essential feature initialization...');
  
  // Schedule all deferred tasks in order of priority
  initMainThreadOptimizer(); // Highest priority - performance
  initServiceWorker();       // High priority - PWA support and caching
  initErrorReporting();      // High priority - error handling
  initBluetooth();          // Medium priority - sensor connectivity  
  initCharts();             // Medium priority - data visualization
  initAnalytics();          // Low priority - tracking
  initMap();                // Low priority - maps
  
  // Start the deferred initialization process
  deferredInit.start();
};