import { lazy, Suspense } from 'react';
import { SkeletonCard } from '@/components/shared/SkeletonScreens';

// Defer the import to avoid blocking initial rendering
const MapGraphToggle = lazy(() => 
  new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('./MapGraphToggle').then(module => {
          resolve({ default: module.MapGraphToggle });
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        import('./MapGraphToggle').then(module => {
          resolve({ default: module.MapGraphToggle });
        });
      }, 0);
    }
  })
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