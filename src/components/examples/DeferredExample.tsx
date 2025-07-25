/**
 * Example component demonstrating comprehensive deferred initialization patterns
 * This shows how to implement both component-level and feature-level deferring
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeferredComponent, DeferredChildren, useDeferredCall } from '@/components/shared/DeferredComponents';

const DeferredExample = () => {
  const [heavyFeatureLoaded, setHeavyFeatureLoaded] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const { deferCall } = useDeferredCall();

  // Example 1: Defer expensive initialization work
  useEffect(() => {
    // ✅ GOOD: Defer non-critical initialization
    deferCall(async () => {
      // Simulate heavy initialization work
      console.log('🚀 [DEFERRED] Heavy feature initialization started');
      
      // Load heavy modules only when browser is idle
      const heavyModule = await import('@/lib/heavyFeatureModule');
      await heavyModule.initialize();
      
      setHeavyFeatureLoaded(true);
      console.log('✅ [DEFERRED] Heavy feature ready');
    }, 'low');

    // ✅ GOOD: Defer analytics and monitoring
    deferCall(async () => {
      // Collect performance metrics when idle
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        setPerformanceMetrics({
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart)
        });
      }
    }, 'low');
  }, [deferCall]);

  // Example 2: User-triggered deferred loading
  const handleLoadHeavyFeature = () => {
    deferCall(async () => {
      const { loadTensorFlow } = await import('@/lib/dynamicImports');
      await loadTensorFlow();
      console.log('🧠 TensorFlow loaded on demand');
    }, 'high'); // High priority when user explicitly requests it
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Deferred Initialization Demo</h2>
        <p className="text-muted-foreground">
          This page demonstrates various deferred loading patterns for optimal performance
        </p>
      </div>

      {/* Example 1: Deferred Chart Component */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">📊 Deferred Chart Component</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Chart loads only when browser is idle (medium priority)
        </p>
        
        <DeferredComponent
          component={() => import('@/components/PMLineGraph').then(m => ({ default: m.PMLineGraph }))}
          priority="medium"
          fallback={
            <div className="h-48 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <div className="text-xs text-muted-foreground">Loading chart...</div>
              </div>
            </div>
          }
          data={[]} // Pass props to the component
        />
      </Card>

      {/* Example 2: Deferred Children */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">⏰ Deferred Children</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Content loads after 2 seconds or when browser is idle
        </p>
        
        <DeferredChildren
          priority="low"
          delay={2000}
          fallback={
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          }
        >
          <div className="p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium text-primary">✅ Heavy Content Loaded!</h4>
            <p className="text-sm mt-1">
              This content was deferred to avoid blocking the initial render.
              It loaded when the browser had idle time available.
            </p>
          </div>
        </DeferredChildren>
      </Card>

      {/* Example 3: Status Indicators */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">📈 Deferred Features Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Heavy Feature</span>
              <Badge variant={heavyFeatureLoaded ? "default" : "secondary"}>
                {heavyFeatureLoaded ? "Ready" : "Loading..."}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Performance Metrics</span>
              <Badge variant={performanceMetrics ? "default" : "secondary"}>
                {performanceMetrics ? "Collected" : "Pending"}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            {performanceMetrics && (
              <div className="text-xs space-y-1">
                <div>DOM Ready: {performanceMetrics.domContentLoaded}ms</div>
                <div>Load Complete: {performanceMetrics.loadComplete}ms</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Example 4: On-Demand Loading */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">🎯 On-Demand Loading</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Load heavy features only when user explicitly requests them
        </p>
        
        <Button onClick={handleLoadHeavyFeature} variant="outline">
          Load AI Features (~4MB)
        </Button>
      </Card>

      {/* Example 5: Performance Tips */}
      <Card className="p-4 bg-muted/30">
        <h3 className="font-semibold mb-3">💡 Performance Tips Demonstrated</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">✅ What We Do Right:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Use requestIdleCallback for non-critical work</li>
              <li>• Defer charts until browser is idle</li>
              <li>• Load AI features only on user request</li>
              <li>• Collect metrics in background</li>
              <li>• Show meaningful loading states</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">❌ What to Avoid:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Heavy computation during initial render</li>
              <li>• Loading all features immediately</li>
              <li>• Blocking main thread with initialization</li>
              <li>• No loading feedback for users</li>
              <li>• Same priority for all deferred tasks</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeferredExample;