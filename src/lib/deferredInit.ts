/**
 * Deferred initialization manager
 * Handles non-essential initialization after critical rendering
 */

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
 * Defer service worker registration
 */
export const initServiceWorker = () => {
  deferredInit.addTask({
    name: 'service-worker',
    priority: 'low',
    task: async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          console.debug('[PERF] Service Worker registered');
        } catch (error) {
          console.error('[PERF] Service Worker registration failed:', error);
        }
      }
    },
    timeout: 5000
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
 * Defer GPS/location services initialization
 */
export const initLocationServices = () => {
  deferredInit.addTask({
    name: 'location-services',
    priority: 'medium',
    task: async () => {
      if ('geolocation' in navigator) {
        // Preload GPS hook for faster access when needed
        await import('@/hooks/useGPS');
        console.debug('[PERF] Location services initialized');
      }
    },
    timeout: 2000
  });
};

/**
 * Defer theme system initialization (beyond basic theme)
 */
export const initAdvancedTheme = () => {
  deferredInit.addTask({
    name: 'advanced-theme',
    priority: 'low',
    task: async () => {
      // Initialize theme transitions and advanced features
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --transition-theme: color 200ms ease, background-color 200ms ease, border-color 200ms ease;
        }
        * {
          transition: var(--transition-theme);
        }
      `;
      document.head.appendChild(style);
      console.debug('[PERF] Advanced theme features initialized');
    },
    timeout: 3000
  });
};

/**
 * Defer notification system initialization
 */
export const initNotifications = () => {
  deferredInit.addTask({
    name: 'notifications',
    priority: 'medium',
    task: async () => {
      // Check and request notification permissions if needed
      if ('Notification' in window && Notification.permission === 'default') {
        // Don't request immediately, just prepare the system
        console.debug('[PERF] Notification system ready (permission not requested)');
      }
      
      // Preload notification components
      await import('@/hooks/useNotifications');
      console.debug('[PERF] Notification system initialized');
    },
    timeout: 2000
  });
};

/**
 * Defer internationalization for non-default languages
 */
export const initI18nExtended = () => {
  deferredInit.addTask({
    name: 'i18n-extended',
    priority: 'low',
    task: async () => {
      // Preload additional language resources
      const currentLang = localStorage.getItem('i18nextLng') || 'en';
      if (currentLang !== 'en') {
        try {
          // Dynamically load non-English language packs
          const { loadI18nUtils } = await import('@/lib/dynamicImports');
          await loadI18nUtils();
          console.debug(`[PERF] Extended i18n loaded for language: ${currentLang}`);
        } catch (error) {
          console.debug('[PERF] Extended i18n loading failed, using fallback');
        }
      }
    },
    timeout: 4000
  });
};

/**
 * Defer sensor calibration and background tasks
 */
export const initSensorBackgroundTasks = () => {
  deferredInit.addTask({
    name: 'sensor-background',
    priority: 'medium',
    task: async () => {
      // Initialize sensor calibration and background monitoring
      await import('@/hooks/useBackgroundRecording');
      await import('@/hooks/useSensorData');
      console.debug('[PERF] Sensor background tasks initialized');
    },
    timeout: 3000
  });
};

/**
 * Defer data sync and storage optimization
 */
export const initDataSync = () => {
  deferredInit.addTask({
    name: 'data-sync',
    priority: 'low',
    task: async () => {
      // Initialize data synchronization and cleanup
      await import('@/lib/dataSync');
      await import('@/services/storageService');
      
      // Clean up old data if needed
      const storage = await import('@/hooks/useStorage');
      // Future: Implement data cleanup logic
      
      console.debug('[PERF] Data sync and storage optimization initialized');
    },
    timeout: 5000
  });
};

/**
 * Defer performance monitoring
 */
export const initPerformanceMonitoring = () => {
  deferredInit.addTask({
    name: 'performance-monitoring',
    priority: 'low',
    task: async () => {
      // Initialize performance monitoring and metrics collection
      if ('performance' in window && 'mark' in performance) {
        performance.mark('app-fully-initialized');
        
        // Log key performance metrics
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const metrics = {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
            firstPaint: Math.round(navigation.loadEventEnd - navigation.fetchStart),
            totalLoadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart)
          };
          console.debug('[PERF] Performance metrics:', metrics);
        }
      }
      
      // Initialize bundle analyzer if in development
      if (process.env.NODE_ENV === 'development') {
        const { checkBundleUsage } = await import('@/lib/bundleAnalyzer');
        (window as any).checkBundleUsage = checkBundleUsage;
      }
      
      console.debug('[PERF] Performance monitoring initialized');
    },
    timeout: 6000
  });
};

/**
 * Initialize all non-critical features
 */
export const initNonEssentialFeatures = () => {
  console.debug('[PERF] 🚀 Scheduling non-essential feature initialization...');
  
  // Schedule all deferred tasks in priority order
  
  // High priority - essential for functionality but not blocking
  initErrorReporting();       // Error handling
  
  // Medium priority - enhances UX but not critical for first paint
  initLocationServices();     // GPS/location services
  initNotifications();        // Notification system
  initSensorBackgroundTasks(); // Sensor calibration
  initBluetooth();           // Bluetooth connectivity
  initCharts();              // Data visualization
  
  // Low priority - nice-to-have features
  initAdvancedTheme();       // Theme transitions
  initI18nExtended();        // Additional languages
  initDataSync();            // Data synchronization
  initAnalytics();           // Usage tracking
  initMap();                 // Map preloading
  initServiceWorker();       // Offline support
  initPerformanceMonitoring(); // Performance metrics
  
  // Start the deferred initialization process
  deferredInit.start();
  
  console.debug('[PERF] ✅ Non-essential feature scheduling complete');
};