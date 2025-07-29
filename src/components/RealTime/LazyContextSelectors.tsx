import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Dynamically import the ContextSelectors component
const ContextSelectors = lazy(() => import('@/components/RecordingControls/ContextSelectors').then(module => ({
  default: module.ContextSelectors
})));

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