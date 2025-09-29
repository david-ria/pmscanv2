import { useRef, useCallback, useState } from 'react';
import { useAutoContext } from './useAutoContext';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { formatAutomaticContext } from '@/utils/contextFormatter';

interface AutoContextSamplingProps {
  recordingFrequency: string;
  isRecording: boolean;
}

export function useAutoContextSampling({ 
  recordingFrequency, 
  isRecording 
}: AutoContextSamplingProps) {
  const lastContextUpdateTime = useRef<Date | null>(null);
  const [currentAutoContext, setCurrentAutoContext] = useState<string>('');
  const { determineContext, updateLatestContext, isEnabled: autoContextEnabled } = useAutoContext();

  const updateContextIfNeeded = useCallback(async (
    pmData?: PMScanData,
    location?: LocationData,
    speed: number = 0,
    isMoving: boolean = false
    // Removed enrichedLocationName - autocontext should be pure activity detection
  ): Promise<string> => {
    if (!autoContextEnabled) {
      return '';
    }

    // Update context for every data point - no frequency throttling needed
    // The context determination is lightweight and should happen for each measurement

    // Update last context update time
    lastContextUpdateTime.current = new Date();

    // Get rule-based context first
    const ruleBasedContext = await determineContext({
      pmData,
      location,
      speed,
      isMoving,
    });

    // Use ONLY rule-based context from sensors/heuristics - no location mixing
    const formattedContext = ruleBasedContext || '';
    
    console.log('🤖 === PURE AUTOCONTEXT (sensors + heuristics) ===', {
      ruleBasedContext,
      finalContext: formattedContext,
      source: 'sensors and movement heuristics only'
    });
    
    if (formattedContext) {
      console.log('🏷️ Autocontext determined:', formattedContext);
      updateLatestContext(formattedContext);
      setCurrentAutoContext(formattedContext);
      return formattedContext;
    } else {
      console.log('🔄 No autocontext determined');
      return currentAutoContext;
    }
  }, [autoContextEnabled, recordingFrequency, determineContext, updateLatestContext, currentAutoContext]);

  const forceContextUpdate = useCallback(async (
    pmData?: PMScanData,
    location?: LocationData,
    speed: number = 0,
    isMoving: boolean = false
  ) => {
    if (!autoContextEnabled) {
      return;
    }

    const automaticContext = await determineContext({
      pmData,
      location,
      speed,
      isMoving,
    });

    if (automaticContext) {
      updateLatestContext(automaticContext);
    } else {
      // Fallback context when no specific context is determined
      updateLatestContext('Indoor');
    }
  }, [autoContextEnabled, determineContext, updateLatestContext]);

  return {
    updateContextIfNeeded,
    forceContextUpdate,
    autoContextEnabled,
  };
}