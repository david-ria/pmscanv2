import { createContext, useContext, useState } from 'react';

export type SensorType = 'pmScan' | 'airBeam';

interface SensorContextValue {
  sensorType: SensorType;
  setSensorType: (type: SensorType) => void;
}

const SensorContext = createContext<SensorContextValue | undefined>(undefined);

export function SensorProvider({ children }: { children: React.ReactNode }) {
  const [sensorType, setSensorType] = useState<SensorType>('pmScan');

  return (
    <SensorContext.Provider value={{ sensorType, setSensorType }}>
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensor must be used within SensorProvider');
  return ctx;
}
