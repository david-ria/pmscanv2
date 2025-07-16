import React, { createContext, useContext, useState } from 'react';

export type SensorType = 'pmscan' | 'airbeam';

interface SensorSelectionContextType {
  sensor: SensorType;
  setSensor: (sensor: SensorType) => void;
}

const SensorSelectionContext = createContext<SensorSelectionContextType | undefined>(
  undefined
);

export function SensorSelectionProvider({ children }: { children: React.ReactNode }) {
  const [sensor, setSensor] = useState<SensorType>('pmscan');

  return (
    <SensorSelectionContext.Provider value={{ sensor, setSensor }}>
      {children}
    </SensorSelectionContext.Provider>
  );
}

export function useSensorSelection() {
  const context = useContext(SensorSelectionContext);
  if (context === undefined) {
    throw new Error('useSensorSelection must be used within a SensorSelectionProvider');
  }
  return context;
}
