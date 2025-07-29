import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Defer the import to avoid blocking initial rendering
const ContextSelectors = lazy(() =>
  new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('@/components/RecordingControls/ContextSelectors').then(module => {
          resolve({ default: module.ContextSelectors });
        });
      });
    } else {
      setTimeout(() => {
        import('@/components/RecordingControls/ContextSelectors').then(module => {
          resolve({ default: module.ContextSelectors });
        });
      }, 0);
    }
  })
);

interface LazyContextSelectorsProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  selectedActivity: string;
  onActivityChange: (activity: string) => void;
  isRecording: boolean;
}

export function LazyContextSelectors(props: LazyContextSelectorsProps) {
  return (
    <Suspense 
      fallback={
        <div className="mb-4 context-selector">
          <SkeletonCard className="h-20" />
        </div>
      }
    >
      <div className="mb-4 context-selector">
        <ContextSelectors {...props} />
      </div>
    </Suspense>
  );
}