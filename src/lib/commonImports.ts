// Clean and optimized version of import consolidation
// Removes duplicate patterns and standardizes imports

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo, 
  useCallback,
  Suspense, 
  lazy 
} from 'react';

// UI Components - grouped and optimized
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

import { 
  Button 
} from '@/components/ui/button';

import { 
  Badge 
} from '@/components/ui/badge';

import { 
  Progress 
} from '@/components/ui/progress';

import { 
  Skeleton 
} from '@/components/ui/skeleton';

// Utilities
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Core hooks and contexts - immediate imports
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useThresholds } from '@/contexts/ThresholdContext';

// Types
import { PMScanData } from '@/lib/pmscan/types';

// Optimized logger
import { devLogger } from '@/utils/optimizedLogger';
import { optimizedStyles, animations } from '@/lib/optimizations';

// Constants
import { frequencyOptionKeys } from '@/lib/recordingConstants';

/**
 * Re-export commonly used patterns to reduce import duplication
 */
export {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Skeleton,
  cn,
  useToast,
  PMScanData,
  devLogger,
  optimizedStyles,
  animations
};

/**
 * Common component patterns for consistency
 */
export const CommonPatterns = {
  // Loading states
  LoadingSkeleton: ({ className = "", height = "h-20" }: { className?: string; height?: string }) => (
    <div className={cn(`${height} bg-muted/20 rounded-lg animate-pulse`, className)} />
  ),

  // Error boundary fallback
  ErrorFallback: ({ error, retry }: { error: string; retry?: () => void }) => (
    <Card className="p-6 text-center">
      <CardContent>
        <p className="text-destructive mb-4">{error}</p>
        {retry && (
          <Button variant="outline" onClick={retry}>
            Réessayer
          </Button>
        )}
      </CardContent>
    </Card>
  ),

  // Empty state
  EmptyState: ({ title, description, action }: { 
    title: string; 
    description: string; 
    action?: React.ReactNode;
  }) => (
    <Card className="p-8 text-center">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {action}
      </CardContent>
    </Card>
  ),

  // Air quality indicator
  AirQualityBadge: ({ 
    quality, 
    children 
  }: { 
    quality: { color: string; level: string }; 
    children: React.ReactNode;
  }) => (
    <Badge 
      variant="secondary" 
      className={cn(
        "text-xs px-2 py-1",
        `bg-air-${quality.color} text-air-${quality.color}-foreground`
      )}
    >
      {children}
    </Badge>
  ),

  // Performance optimized grid
  ResponsiveGrid: ({ 
    children, 
    className = "" 
  }: { 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <div className={cn("content-grid", className)}>
      {children}
    </div>
  ),
};

/**
 * Lazy loading helpers
 */
export const LazyComponents = {
  // Common lazy loading pattern
  createLazyComponent: (
    importFn: () => Promise<any>,
    exportName?: string
  ) => lazy(() => 
    importFn().then(module => ({
      default: exportName ? module[exportName] : module.default
    }))
  ),

  // Common fallback for lazy components
  Fallback: ({ height = "h-20" }: { height?: string }) => (
    <CommonPatterns.LoadingSkeleton height={height} />
  ),
};

/**
 * Performance monitoring helpers
 */
export const PerformanceHelpers = {
  // Measure component render time
  measureRender: (componentName: string, fn: () => void) => {
    devLogger.performance(`Render: ${componentName}`, fn);
  },

  // Debounce helper
  debounce: (
    func: (...args: any[]) => any,
    wait: number
  ) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle helper
  throttle: (
    func: (...args: any[]) => any,
    limit: number
  ) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

console.debug('[PERF] Consolidated imports and patterns loaded');