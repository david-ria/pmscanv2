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

// Fully deferred RealTime component that only initializes hooks when user interacts
export const RealTimeContentDeferred = React.memo((props: RealTimeContentProps) => {
  const [hooksInitialized, setHooksInitialized] = useState(false);
  const [RealTimeWithHooks, setRealTimeWithHooks] = useState<React.ComponentType<RealTimeContentProps> | null>(null);
  const hasInitialized = useRef(false);

  // Initialize hooks only when user actually needs them
  const initializeHooks = async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[PERF] 🚀 User wants to interact - Initializing ALL hooks now');
    const start = performance.now();

    // Import the actual RealTimeContent with all its hooks
    const { RealTimeContent } = await import('./RealTimeContent');
    
    console.log(`[PERF] ✅ All hooks and content loaded in ${performance.now() - start}ms`);
    setRealTimeWithHooks(() => RealTimeContent);
    setHooksInitialized(true);
  };

  // Show lightweight UI with no heavy hooks initialized
  if (!hooksInitialized || !RealTimeWithHooks) {
    console.log('[PERF] 🔄 Showing shell UI - NO HOOKS INITIALIZED YET');
    
    return (
      <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
        {/* Interactive map placeholder */}
        <div 
          onClick={initializeHooks}
          className="mb-6 cursor-pointer group"
        >
          <MapPlaceholder
            showGraph={props.showGraph}
            onToggleView={() => {
              initializeHooks();
              props.setShowGraph(!props.showGraph);
            }}
            isOnline={props.isOnline}
            device={null}
            isConnected={false}
            onConnect={initializeHooks}
            onDisconnect={() => {}}
            onStartRecording={initializeHooks}
            locationEnabled={false}
            latestLocation={null}
          />
          <div className="text-center mt-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Click map to activate full functionality
          </div>
        </div>

        {/* Air quality cards with empty data */}
        <div className="mb-6">
          <AirQualityCards currentData={null} isConnected={false} />
        </div>

        {/* Interactive sections that trigger hook loading */}
        <div className="space-y-4">
          <button 
            onClick={initializeHooks}
            className="w-full p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="w-4 h-4 bg-primary/60 rounded-full animate-pulse" />
              <span className="text-lg font-medium group-hover:text-primary transition-colors">
                Connect Bluetooth Device
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Click to initialize Bluetooth and recording features
            </p>
          </button>

          <button 
            onClick={initializeHooks}
            className="w-full p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-muted-foreground/60 rounded-full animate-pulse" />
              <span className="group-hover:text-foreground transition-colors">
                Load Context & Location Features
              </span>
            </div>
          </button>

          <button 
            onClick={initializeHooks}
            className="w-full p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-muted-foreground/60 rounded-full animate-pulse" />
              <span className="group-hover:text-foreground transition-colors">
                Load Data Logger & Analytics
              </span>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Heavy processing deferred until interaction
        </div>
      </div>
    );
  }

  console.log('[PERF] ✅ NOW rendering component with all hooks initialized');
  return <RealTimeWithHooks {...props} />;
});

export default RealTimeContentDeferred;