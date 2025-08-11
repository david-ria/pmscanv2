/**
 * Safe dynamic import utilities with fallback handling
 * Prevents phantom chunk errors by providing robust error handling
 */
import React from 'react';

interface ImportWithFallback<T> {
  import: () => Promise<T>;
  fallback?: T;
  name: string;
}

/**
 * Safe dynamic import wrapper that handles phantom chunk errors
 */
export const safeImport = async <T>(
  importFn: () => Promise<T>,
  fallbackValue?: T,
  moduleName = 'unknown'
): Promise<T> => {
  try {
    const result = await importFn();
    return result;
  } catch (error) {
    console.warn(`Failed to load module "${moduleName}":`, error);
    
    if (fallbackValue !== undefined) {
      console.info(`Using fallback for module "${moduleName}"`);
      return fallbackValue;
    }
    
    // Re-throw if no fallback available
    throw new Error(`Module "${moduleName}" failed to load and no fallback provided`);
  }
};

/**
 * Retry dynamic import with exponential backoff
 */
export const retryImport = async <T>(
  importFn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  moduleName = 'unknown'
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Import attempt ${attempt}/${maxRetries} failed for "${moduleName}":`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw new Error(`Module "${moduleName}" failed after ${maxRetries} attempts: ${lastError!.message}`);
};

/**
 * Safe component loader for React lazy loading
 */
export const safeComponentImport = (
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  moduleName: string
) => {
  return async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error(`Failed to load component "${moduleName}":`, error);
      
      // Return a fallback error component
      const FallbackComponent: React.ComponentType<any> = () => 
        React.createElement('div', {
          className: 'p-4 border border-destructive/20 rounded-lg bg-destructive/5'
        }, React.createElement('p', {
          className: 'text-sm text-destructive'
        }, `Failed to load component: ${moduleName}`));
      
      return {
        default: FallbackComponent
      };
    }
  };
};