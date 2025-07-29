import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Dynamically import the AutoContextDisplay component
const AutoContextDisplay = lazy(() => import('@/components/AutoContextDisplay').then(module => ({
  default: module.AutoContextDisplay
})));

export function LazyAutoContextDisplay() {
  return (
    <Suspense 
      fallback={
        <div className="mb-4 auto-context-display">
          <SkeletonCard className="h-16" />
        </div>
      }
    >
      <div className="mb-4 auto-context-display">
        <AutoContextDisplay />
      </div>
    </Suspense>
  );
}