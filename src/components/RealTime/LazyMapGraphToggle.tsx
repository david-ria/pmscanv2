import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Load immediately when needed, don't defer critical user interactions
const MapGraphToggle = lazy(() => 
  import('./MapGraphToggle').then(module => ({
    default: module.MapGraphToggle
  }))
);

interface LazyMapGraphToggleProps {
  showGraph: boolean;
  onToggleView: (show: boolean) => void;
  isOnline: boolean;
  latestLocation: any;
  currentData: any;
  recordingData: any;
  events: any[];
  isRecording: boolean;
  device: any;
  isConnected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onRequestLocationPermission: () => Promise<boolean>;
  locationEnabled: boolean;
}

export function LazyMapGraphToggle(props: LazyMapGraphToggleProps) {
  return (
    <Suspense 
      fallback={
        <div className="mb-4">
          <SkeletonCard className="h-80" />
        </div>
      }
    >
      <MapGraphToggle {...props} />
    </Suspense>
  );
}