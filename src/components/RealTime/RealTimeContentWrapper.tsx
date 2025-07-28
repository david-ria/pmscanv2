import React, { useState, useEffect, useRef } from 'react';
import { AirQualityCards } from '@/components/RealTime/AirQualityCards';
import { MapPlaceholder } from '@/components/RealTime/MapPlaceholder';

interface RealTimeContentProps {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  showGraph: boolean;
  setShowGraph: (value: boolean) => void;
  showFrequencyDialog: boolean;
  setShowFrequencyDialog: (value: boolean) => void;
  recordingFrequency: string;
  setRecordingFrequency: (value: string) => void;
  hasShownFrequencyDialog: boolean;
  setHasShownFrequencyDialog: (value: boolean) => void;
  currentEvents: any[];
  setCurrentEvents: (events: any[]) => void;
  t: (key: string, options?: any) => string;
  toast: (options: any) => void;
}

// Lightweight wrapper that shows critical UI first, then loads heavy content
export const RealTimeContentWrapper = React.memo((props: RealTimeContentProps) => {
  const [heavyContentLoaded, setHeavyContentLoaded] = useState(false);
  const [HeavyRealTimeContent, setHeavyRealTimeContent] = useState<React.ComponentType<RealTimeContentProps> | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[PERF] 🚀 RealTimeContentWrapper - Starting to load heavy content');
    const start = performance.now();

    // Load the actual heavy content after a microtask to ensure UI renders first
    Promise.resolve().then(() => {
      import('./RealTimeContent').then((module) => {
        console.log(`[PERF] ✅ Heavy RealTimeContent loaded in ${performance.now() - start}ms`);
        setHeavyRealTimeContent(() => module.RealTimeContent);
        setHeavyContentLoaded(true);
      }).catch((error) => {
        console.error('[PERF] ❌ Failed to load RealTimeContent:', error);
      });
    });
  }, []);

  // Show lightweight UI first with critical components only
  if (!heavyContentLoaded || !HeavyRealTimeContent) {
    console.log('[PERF] 🔄 RealTimeContentWrapper - Showing lightweight UI');
    return (
      <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
        {/* Show map placeholder immediately */}
        <MapPlaceholder
          showGraph={props.showGraph}
          onToggleView={props.setShowGraph}
          isOnline={props.isOnline}
          device={null}
          isConnected={false}
          onConnect={() => console.log('Loading...')}
          onDisconnect={() => {}}
          onStartRecording={() => console.log('Loading...')}
          locationEnabled={false}
          latestLocation={null}
        />

        {/* Show air quality cards with empty data */}
        <AirQualityCards currentData={null} isConnected={false} />

        {/* Loading indicators for other sections */}
        <div className="mb-4">
          <div className="h-20 bg-muted/20 rounded-lg animate-pulse" />
        </div>
        <div className="mb-4">
          <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        </div>
        <div className="mb-4">
          <div className="h-32 bg-muted/20 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  console.log('[PERF] ✅ RealTimeContentWrapper - Rendering heavy content');
  return <HeavyRealTimeContent {...props} />;
});

export default RealTimeContentWrapper;