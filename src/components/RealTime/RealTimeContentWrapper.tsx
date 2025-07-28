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

// Lightweight wrapper that shows critical UI first, only loads heavy content when needed
export const RealTimeContentWrapper = React.memo((props: RealTimeContentProps) => {
  const [shouldLoadHeavyContent, setShouldLoadHeavyContent] = useState(false);
  const [HeavyRealTimeContent, setHeavyRealTimeContent] = useState<React.ComponentType<RealTimeContentProps> | null>(null);
  const hasInitialized = useRef(false);

  // Only load heavy content when user actually interacts with the page
  const triggerHeavyContentLoad = () => {
    if (hasInitialized.current || shouldLoadHeavyContent) return;
    hasInitialized.current = true;
    setShouldLoadHeavyContent(true);

    console.log('[PERF] 🚀 User interaction detected - Loading heavy content now');
    const start = performance.now();

    import('./RealTimeContent').then((module) => {
      console.log(`[PERF] ✅ Heavy RealTimeContent loaded in ${performance.now() - start}ms`);
      setHeavyRealTimeContent(() => module.RealTimeContent);
    }).catch((error) => {
      console.error('[PERF] ❌ Failed to load RealTimeContent:', error);
    });
  };

  // Auto-load after a delay if user doesn't interact (fallback)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!shouldLoadHeavyContent) {
        console.log('[PERF] 🕐 Auto-loading heavy content after delay');
        triggerHeavyContentLoad();
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [shouldLoadHeavyContent]);

  // Show lightweight UI first with critical components only
  if (!shouldLoadHeavyContent || !HeavyRealTimeContent) {
    console.log('[PERF] 🔄 RealTimeContentWrapper - Showing lightweight UI');
    return (
      <div 
        className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6"
        onClick={triggerHeavyContentLoad}
        onFocus={triggerHeavyContentLoad}
        onMouseMove={triggerHeavyContentLoad}
      >
        {/* Show map placeholder immediately */}
        <MapPlaceholder
          showGraph={props.showGraph}
          onToggleView={props.setShowGraph}
          isOnline={props.isOnline}
          device={null}
          isConnected={false}
          onConnect={triggerHeavyContentLoad}
          onDisconnect={() => {}}
          onStartRecording={triggerHeavyContentLoad}
          locationEnabled={false}
          latestLocation={null}
        />

        {/* Show air quality cards with empty data */}
        <AirQualityCards currentData={null} isConnected={false} />

        {/* Interactive loading sections */}
        <div className="mb-4">
          <button 
            onClick={triggerHeavyContentLoad}
            className="w-full h-20 bg-muted/20 rounded-lg animate-pulse hover:bg-muted/30 transition-colors flex items-center justify-center text-muted-foreground"
          >
            Click to load recording controls
          </button>
        </div>
        <div className="mb-4">
          <button 
            onClick={triggerHeavyContentLoad}
            className="w-full h-16 bg-muted/20 rounded-lg animate-pulse hover:bg-muted/30 transition-colors flex items-center justify-center text-muted-foreground"
          >
            Click to load context selectors
          </button>
        </div>
        <div className="mb-4">
          <button 
            onClick={triggerHeavyContentLoad}
            className="w-full h-32 bg-muted/20 rounded-lg animate-pulse hover:bg-muted/30 transition-colors flex items-center justify-center text-muted-foreground"
          >
            Click to load data logger
          </button>
        </div>
      </div>
    );
  }

  console.log('[PERF] ✅ RealTimeContentWrapper - Rendering heavy content');
  return <HeavyRealTimeContent {...props} />;
});

export default RealTimeContentWrapper;