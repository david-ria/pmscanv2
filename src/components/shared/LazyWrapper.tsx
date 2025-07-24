import React, { Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

const DefaultErrorFallback = () => (
  <div className="flex items-center justify-center p-8 text-muted-foreground">
    <p>Failed to load component</p>
  </div>
);

/**
 * Wrapper component for lazy-loaded components with error handling
 */
export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <DefaultFallback />,
  errorFallback = <DefaultErrorFallback />
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};