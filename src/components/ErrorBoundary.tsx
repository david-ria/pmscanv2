/**
 * Enhanced error boundary component for production-ready error handling
 */
import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import * as logger from '@/utils/logger';
import { getVersionedItem, setVersionedItem, removeVersionedItem } from '@/lib/versionedStorage';
import { z } from 'zod';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReload?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  previousCrash?: CrashDump | null;
}

interface CrashDump {
  timestamp: number;
  userAgent: string;
  url: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack?: string;
  breadcrumbs?: string[];
  version: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      previousCrash: this.loadPreviousCrash()
    };
  }

  private loadPreviousCrash(): CrashDump | null {
    try {
      const crashDump = getVersionedItem('CRASH_RECOVERY', {
        schema: z.object({
          timestamp: z.number(),
          userAgent: z.string(),
          url: z.string(),
          error: z.object({
            name: z.string(),
            message: z.string(),
            stack: z.string().optional(),
          }),
          componentStack: z.string().optional(),
          breadcrumbs: z.array(z.string()).optional(),
          version: z.string(),
        }),
        migrationStrategy: 'reset',
      }) as CrashDump | null;
      
      // Only return crash if it's recent (within last 24 hours)
      if (crashDump && crashDump.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        return crashDump;
      }
      
      // Clean up old crash data
      if (crashDump) {
        removeVersionedItem('CRASH_RECOVERY');
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load previous crash data:', error);
      return null;
    }
  }

  private persistCrashDump(error: Error, errorInfo?: React.ErrorInfo) {
    try {
      const crashDump: CrashDump = {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo?.componentStack,
        breadcrumbs: this.getBreadcrumbs(),
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
      };

      setVersionedItem('CRASH_RECOVERY', crashDump);
      
      // Also try to flush any pending logs if available
      try {
        if ('flush' in logger && typeof (logger as any).flush === 'function') {
          (logger as any).flush();
        }
      } catch (flushError) {
        console.warn('Failed to flush logs:', flushError);
      }
      
      console.log('Crash dump persisted for diagnostics');
    } catch (storageError) {
      console.warn('Failed to persist crash dump:', storageError);
      // Don't block the reload if storage fails
    }
  }

  private getBreadcrumbs(): string[] {
    try {
      // Try to get navigation breadcrumbs from browser history
      const breadcrumbs = [];
      
      // Add current page info
      breadcrumbs.push(`Current: ${window.location.pathname}`);
      
      // Add referrer if available
      if (document.referrer) {
        breadcrumbs.push(`Referrer: ${document.referrer}`);
      }
      
      // Add timestamp
      breadcrumbs.push(`Time: ${new Date().toISOString()}`);
      
      return breadcrumbs;
    } catch {
      return [];
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Persist crash dump before any reload might happen
    this.persistCrashDump(error, errorInfo);

    // Log error to monitoring service
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      previousCrash: this.state.previousCrash ? {
        timestamp: this.state.previousCrash.timestamp,
        recurring: true
      } : undefined,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    // Ensure crash dump is persisted before reload
    if (this.state.error) {
      this.persistCrashDump(this.state.error, this.state.errorInfo);
    }
    
    // Clear build caches to prevent phantom chunk issues
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => caches.delete(cacheName));
      });
    }
    
    // Small delay to ensure storage operations complete
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleViewCrashReport = () => {
    if (this.state.previousCrash) {
      // Create a detailed crash report for debugging
      const report = {
        ...this.state.previousCrash,
        formatted: {
          timestamp: new Date(this.state.previousCrash.timestamp).toLocaleString(),
          timeSince: `${Math.round((Date.now() - this.state.previousCrash.timestamp) / 60000)} minutes ago`,
        }
      };
      
      console.group('🔍 Previous Crash Report');
      console.log('Timestamp:', report.formatted.timestamp);
      console.log('Time Since:', report.formatted.timeSince);
      console.log('URL:', report.url);
      console.log('User Agent:', report.userAgent);
      console.log('Error:', report.error);
      if (report.componentStack) {
        console.log('Component Stack:', report.componentStack);
      }
      if (report.breadcrumbs) {
        console.log('Breadcrumbs:', report.breadcrumbs);
      }
      console.groupEnd();
      
      // Also copy to clipboard for easy sharing
      navigator.clipboard?.writeText(JSON.stringify(report, null, 2)).then(() => {
        console.log('📋 Crash report copied to clipboard');
      }).catch(() => {
        console.log('📋 Crash report available in console');
      });
    }
  };

  handleDismissCrashReport = () => {
    removeVersionedItem('CRASH_RECOVERY');
    this.setState({ previousCrash: null });
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Loading chunk') || 
                          this.state.error?.message?.includes('Loading CSS chunk') ||
                          this.state.error?.name === 'ChunkLoadError';

      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with special handling for chunk errors
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isChunkError ? 'App Update Available' : 'Something went wrong'}
              </h1>
              <p className="text-muted-foreground">
                {isChunkError 
                  ? 'The app has been updated. Please refresh to load the latest version.'
                  : "We're sorry, but something unexpected happened. Please try refreshing the page."
                }
              </p>
            </div>

            {/* Previous crash report notification */}
            {this.state.previousCrash && !this.state.hasError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Previous crash detected</span>
                </div>
                <p className="text-yellow-700 dark:text-yellow-300 mb-3">
                  A crash occurred {Math.round((Date.now() - this.state.previousCrash.timestamp) / 60000)} minutes ago.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={this.handleViewCrashReport}
                    className="text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
                  >
                    View Report
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={this.handleDismissCrashReport}
                    className="text-yellow-700 dark:text-yellow-300"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {import.meta.env.DEV && this.state.error && !isChunkError && (
              <details className="text-left bg-muted p-4 rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2 justify-center">
              {!isChunkError && (
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
              )}
              
              <Button onClick={this.handleReload}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isChunkError ? 'Refresh App' : 'Reload Page'}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Show previous crash notification even when no current error
    if (this.state.previousCrash && !this.state.hasError) {
      return (
        <div>
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className="bg-yellow-50 dark:bg-yellow-900/90 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium text-sm">Crash Report Available</span>
              </div>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs mb-3">
                Previous crash: {Math.round((Date.now() - this.state.previousCrash.timestamp) / 60000)}m ago
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={this.handleViewCrashReport}
                  className="text-xs text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={this.handleDismissCrashReport}
                  className="text-xs text-yellow-700 dark:text-yellow-300"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
          {this.props.children}
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};