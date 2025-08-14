import { useRef, useCallback, useState } from 'react';
import { useAutoContext } from './useAutoContext';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';

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
  ): Promise<string> => {
    if (!autoContextEnabled) {
      return '';
    }

    // Update context for every data point - no frequency throttling needed
    // The context determination is lightweight and should happen for each measurement

    // Update last context update time
    lastContextUpdateTime.current = new Date();

    // Determine context
    const automaticContext = await determineContext({
      pmData,
      location,
      speed,
      isMoving,
    });

    if (automaticContext) {
      updateLatestContext(automaticContext);
      setCurrentAutoContext(automaticContext);
      return automaticContext;
    }
    
    return currentAutoContext;
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