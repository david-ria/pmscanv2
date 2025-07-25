/**
 * Bundle size checker utility for development
 * Run this in browser console to see current module usage
 */

export const checkBundleUsage = () => {
  const performance = window.performance;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  console.group('📦 Bundle Performance Analysis');
  
  // Main metrics
  console.log('🚀 Load Performance:');
  console.log(`- DOM Content Loaded: ${Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)}ms`);
  console.log(`- First Paint: ${Math.round(navigation.loadEventEnd - navigation.fetchStart)}ms`);
  console.log(`- Total Load Time: ${Math.round(navigation.loadEventEnd - navigation.fetchStart)}ms`);
  
  // JavaScript bundles
  const jsResources = resources.filter(r => r.name.includes('.js') && !r.name.includes('node_modules'));
  console.log('\n📄 JavaScript Bundles:');
  jsResources.forEach(resource => {
    const size = resource.transferSize || 0;
    const sizeKB = Math.round(size / 1024);
    const loadTime = Math.round(resource.responseEnd - resource.requestStart);
    console.log(`- ${resource.name.split('/').pop()}: ${sizeKB}KB (${loadTime}ms)`);
  });
  
  // CSS resources
  const cssResources = resources.filter(r => r.name.includes('.css'));
  if (cssResources.length > 0) {
    console.log('\n🎨 CSS Resources:');
    cssResources.forEach(resource => {
      const size = resource.transferSize || 0;
      const sizeKB = Math.round(size / 1024);
      console.log(`- ${resource.name.split('/').pop()}: ${sizeKB}KB`);
    });
  }
  
  // Dynamic imports tracking
  if (window.__DYNAMIC_IMPORTS__) {
    console.log('\n⚡ Dynamic Imports Status:');
    Object.entries(window.__DYNAMIC_IMPORTS__).forEach(([module, loaded]) => {
      console.log(`- ${module}: ${loaded ? '✅ Loaded' : '⏳ Not loaded'}`);
    });
  }
  
  console.groupEnd();
  
  // Return data for programmatic access
  return {
    loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
    domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
    jsResources: jsResources.map(r => ({
      name: r.name.split('/').pop(),
      size: Math.round((r.transferSize || 0) / 1024),
      loadTime: Math.round(r.responseEnd - r.requestStart)
    })),
    totalJSSize: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024
  };
};

// Global tracking for dynamic imports
declare global {
  interface Window {
    __DYNAMIC_IMPORTS__: Record<string, boolean>;
    checkBundleUsage: typeof checkBundleUsage;
  }
}

window.__DYNAMIC_IMPORTS__ = {};
window.checkBundleUsage = checkBundleUsage;

// Track dynamic import usage
export const trackDynamicImport = (moduleName: string) => {
  if (!window.__DYNAMIC_IMPORTS__) {
    window.__DYNAMIC_IMPORTS__ = {};
  }
  window.__DYNAMIC_IMPORTS__[moduleName] = true;
  console.debug(`📦 Dynamic import loaded: ${moduleName}`);
};

// Development helper to simulate different network conditions
export const simulateSlowNetwork = (delayMs: number = 1000) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.warn(`🐌 Simulating slow network (${delayMs}ms delay)`);
  
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return originalFetch(...args);
  };
  
  // Reset after 30 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('🚀 Network simulation reset');
  }, 30000);
};