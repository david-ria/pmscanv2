import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Defer the import to avoid blocking initial rendering
const DataLogger = lazy(() =>
  new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('@/components/DataLogger').then(module => {
          resolve({ default: module.DataLogger });
        });
      });
    } else {
      setTimeout(() => {
        import('@/components/DataLogger').then(module => {
          resolve({ default: module.DataLogger });
        });
      }, 0);
    }
  })
);

interface LazyDataLoggerProps {
  isRecording: boolean;
  currentData: any;
  currentLocation: any;
  missionContext: { location: string; activity: string };
}

export function LazyDataLogger(props: LazyDataLoggerProps) {
  return (
    <Suspense 
      fallback={
        <div className="mb-4">
          <SkeletonCard className="h-32" />
        </div>
      }
    >
      <DataLogger {...props} />
    </Suspense>
  );
}