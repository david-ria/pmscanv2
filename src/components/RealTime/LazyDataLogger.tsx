import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Dynamically import the heavy DataLogger component
const DataLogger = lazy(() => import('@/components/DataLogger').then(module => ({
  default: module.DataLogger
})));

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