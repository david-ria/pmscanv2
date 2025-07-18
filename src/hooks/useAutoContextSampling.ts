import { useRef, useCallback, useState } from 'react';
import { parseFrequencyToMs, shouldRecordData } from '@/lib/recordingUtils';
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

    // Use recording frequency to determine context sampling rate
    const frequencyMs = parseFrequencyToMs(recordingFrequency);

    // Only update context at the same frequency as data recording
    if (!shouldRecordData(lastContextUpdateTime.current, frequencyMs)) {
      return currentAutoContext; // Return current context if not time to update
    }

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