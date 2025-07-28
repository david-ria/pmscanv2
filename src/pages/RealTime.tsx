import React, { useState, useRef, startTransition, useCallback, useMemo, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { frequencyOptionKeys } from '@/lib/recordingConstants';

// Dynamically import the heavy RealTimeContent component
const RealTimeContent = React.lazy(() => import('@/components/RealTime/RealTimeContent'));

export default function RealTime() {
  // Fast LCP - defer heavy initialization
  const [initialized, setInitialized] = useState(false);
  const hasInitRun = useRef(false);
  const renderCount = useRef(0);
  
  // All hooks must be called unconditionally - Rules of Hooks
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showGraph, setShowGraph] = useState(false);
  const [showFrequencyDialog, setShowFrequencyDialog] = useState(false);
  const [recordingFrequency, setRecordingFrequency] = useState(
    frequencyOptionKeys[0].value
  );
  const [hasShownFrequencyDialog, setHasShownFrequencyDialog] = useState(false);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);

  const { t } = useTranslation();
  const { toast } = useToast();

  // ALL hooks must be called before any conditional logic
  const stableT = useCallback(t, []);
  const stableToast = useCallback(toast, []);
  const stableSetIsOnline = useCallback(setIsOnline, []);
  const stableSetShowGraph = useCallback(setShowGraph, []);
  const stableSetShowFrequencyDialog = useCallback(setShowFrequencyDialog, []);
  const stableSetRecordingFrequency = useCallback(setRecordingFrequency, []);
  const stableSetHasShownFrequencyDialog = useCallback(setHasShownFrequencyDialog, []);
  const stableSetCurrentEvents = useCallback(setCurrentEvents, []);

  const contentProps = useMemo(() => ({
    isOnline,
    setIsOnline: stableSetIsOnline,
    showGraph,
    setShowGraph: stableSetShowGraph,
    showFrequencyDialog,
    setShowFrequencyDialog: stableSetShowFrequencyDialog,
    recordingFrequency,
    setRecordingFrequency: stableSetRecordingFrequency,
    hasShownFrequencyDialog,
    setHasShownFrequencyDialog: stableSetHasShownFrequencyDialog,
    currentEvents,
    setCurrentEvents: stableSetCurrentEvents,
    t: stableT,
    toast: stableToast
  }), [
    isOnline, stableSetIsOnline,
    showGraph, stableSetShowGraph,
    showFrequencyDialog, stableSetShowFrequencyDialog,
    recordingFrequency, stableSetRecordingFrequency,
    hasShownFrequencyDialog, stableSetHasShownFrequencyDialog,
    currentEvents, stableSetCurrentEvents,
    stableT, stableToast
  ]);

  // Initialize heavy hooks after first paint - guard with ref to run only once
  React.useEffect(() => {
    if (hasInitRun.current) return;
    hasInitRun.current = true;
    
    console.log('[PERF] 🚀 RealTime - Starting initialization transition');
    const start = performance.now();
    
    startTransition(() => {
      console.log('[PERF] 🔄 RealTime - Setting initialized to true');
      setInitialized(true);
      const end = performance.now();
      console.log(`[PERF] ✅ RealTime - Initialization took ${end - start}ms`);
    });
  }, []);

  // Add debugging for production mount issues
  renderCount.current += 1;
  console.log(`[PERF] 🔄 RealTime component starting... (render #${renderCount.current})`);

  // Early return for loading state - but after all hooks are called
  if (!initialized) {
    console.log('[PERF] 🔄 RealTime - Not initialized, showing loading state');
    return (
      <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
        {/* Critical content only - fastest LCP */}
        <div className="text-center p-8">
          <h1 className="text-2xl font-semibold mb-2">AirSentinels</h1>
          <p className="text-muted-foreground">Chargement des données de qualité de l'air...</p>
          <div className="mt-4 w-8 h-8 bg-primary/20 rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  console.log('[PERF] ✅ RealTime - Initialized, starting hooks initialization');
  
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
          <div className="text-center p-8">
            <h1 className="text-2xl font-semibold mb-2">AirSentinels</h1>
            <p className="text-muted-foreground">Chargement du module temps réel...</p>
            <div className="mt-4 w-8 h-8 bg-primary/20 rounded-full animate-pulse mx-auto" />
          </div>
        </div>
      }
    >
      <RealTimeContent {...contentProps} />
    </Suspense>
  );
}