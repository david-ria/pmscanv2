import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Defer the import to avoid blocking initial rendering  
const AutoContextDisplay = lazy(() =>
  new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('@/components/AutoContextDisplay').then(module => {
          resolve({ default: module.AutoContextDisplay });
        });
      });
    } else {
      setTimeout(() => {
        import('@/components/AutoContextDisplay').then(module => {
          resolve({ default: module.AutoContextDisplay });
        });
      }, 0);
    }
  })
);

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