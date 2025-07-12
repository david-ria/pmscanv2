import { createContext, useContext } from 'react';
import { useGPS } from '@/hooks/useGPS';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { LocationData } from '@/types/PMScan';

interface GPSContextType {
  locationEnabled: boolean;
  latestLocation: LocationData | null;
  error: string | null;
  requestLocationPermission: () => Promise<boolean>;
}

const GPSContext = createContext<GPSContextType | undefined>(undefined);

export function GPSProvider({ children }: { children: React.ReactNode }) {
  const { isRecording } = useRecordingContext();
  const {
    locationEnabled,
    latestLocation,
    error,
    requestLocationPermission,
  } = useGPS(true, isRecording);

  return (
    <GPSContext.Provider value={{ locationEnabled, latestLocation, error, requestLocationPermission }}>
      {children}
    </GPSContext.Provider>
  );
}

export function useGPSContext() {
  const context = useContext(GPSContext);
  if (!context) {
    throw new Error('useGPSContext must be used within a GPSProvider');
  }
  return context;
}
