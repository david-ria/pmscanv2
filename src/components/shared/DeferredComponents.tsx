/**
 * Higher-order component for deferring initialization of heavy components
 * Wraps components to load them only when browser is idle or after a delay
 */

import React, { useState, useEffect, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DeferredComponentProps {
  /** Component to load lazily */
  component: () => Promise<{ default: ComponentType<any> }>;
  /** Fallback component while loading */
  fallback?: React.ReactNode;
  /** Priority for loading - affects timing */
  priority?: 'low' | 'medium' | 'high';
  /** Whether to load immediately on first mount */
  immediate?: boolean;
  /** Props to pass to the loaded component */
  [key: string]: any;
}

/**
 * Deferred component loader using requestIdleCallback
 */
export const DeferredComponent: React.FC<DeferredComponentProps> = ({
  component,
  fallback,
  priority = 'medium',
  immediate = false,
  ...props
}) => {
  const [LoadedComponent, setLoadedComponent] = useState<ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (immediate || LoadedComponent) return;

    const loadComponent = async () => {
      setIsLoading(true);
      try {
        const { default: Component } = await component();
        setLoadedComponent(() => Component);
      } catch (error) {
        console.error('Failed to load deferred component:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Use requestIdleCallback to defer loading based on priority
    if ('requestIdleCallback' in window) {
      const timeout = {
        high: 500,
        medium: 1000,
        low: 2000
      }[priority];

      requestIdleCallback(loadComponent, { timeout });
    } else {
      // Fallback for browsers without requestIdleCallback
      const delay = {
        high: 0,
        medium: 50,
        low: 100
      }[priority];

      setTimeout(loadComponent, delay);
    }
  }, [component, priority, immediate, LoadedComponent]);

  // Load immediately if requested
  useEffect(() => {
    if (immediate && !LoadedComponent && !isLoading) {
      const loadComponent = async () => {
        setIsLoading(true);
        try {
          const { default: Component } = await component();
          setLoadedComponent(() => Component);
        } catch (error) {
          console.error('Failed to load immediate component:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadComponent();
    }
  }, [immediate, component, LoadedComponent, isLoading]);

  // Show fallback while loading
  if (!LoadedComponent) {
    return (
      <>
        {fallback || (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
      </>
    );
  }

  // Render the loaded component
  return <LoadedComponent {...props} />;
};

/**
 * Hook for deferring function calls until browser is idle
 */
export const useDeferredCall = () => {
  const deferCall = (
    callback: () => void | Promise<void>,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    if ('requestIdleCallback' in window) {
      const timeout = {
        high: 500,
        medium: 1000,
        low: 2000
      }[priority];

      requestIdleCallback(async () => {
        try {
          await callback();
        } catch (error) {
          console.error('Deferred call failed:', error);
        }
      }, { timeout });
    } else {
      const delay = {
        high: 0,
        medium: 50,
        low: 100
      }[priority];

      setTimeout(async () => {
        try {
          await callback();
        } catch (error) {
          console.error('Deferred call failed:', error);
        }
      }, delay);
    }
  };

  return { deferCall };
};

/**
 * Component that defers its children's rendering
 */
export const DeferredChildren: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: 'low' | 'medium' | 'high';
  delay?: number;
}> = ({ children, fallback, priority = 'medium', delay }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const renderChildren = () => setShouldRender(true);

    if (delay) {
      setTimeout(renderChildren, delay);
    } else if ('requestIdleCallback' in window) {
      const timeout = {
        high: 500,
        medium: 1000,
        low: 2000
      }[priority];

      requestIdleCallback(renderChildren, { timeout });
    } else {
      const fallbackDelay = {
        high: 0,
        medium: 50,
        low: 100
      }[priority];

      setTimeout(renderChildren, fallbackDelay);
    }
  }, [priority, delay]);

  if (!shouldRender) {
    return (
      <>
        {fallback || (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

// Example usage components demonstrating deferred initialization

/**
 * Example: Defer heavy chart component
 */
export const DeferredChart = (props: any) => (
  <DeferredComponent
    component={() => import('@/components/PMLineGraph')}
    priority="medium"
    fallback={
      <div className="h-64 border rounded-lg animate-pulse bg-muted flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading chart...</div>
      </div>
    }
    {...props}
  />
);

/**
 * Example: Defer map component
 */
export const DeferredMap = (props: any) => (
  <DeferredComponent
    component={() => import('@/components/MapboxMap')}
    priority="low"
    fallback={
      <div className="h-64 border rounded-lg animate-pulse bg-muted flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading map...</div>
      </div>
    }
    {...props}
  />
);

/**
 * Example: Defer analytics dashboard
 */
export const DeferredAnalytics = (props: any) => (
  <DeferredComponent
    component={() => import('@/components/Analysis/StatisticalAnalysis')}
    priority="low"
    fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    }
    {...props}
  />
);