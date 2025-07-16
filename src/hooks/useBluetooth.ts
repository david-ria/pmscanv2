import { useSensor } from '@/contexts/SensorContext';
import { useAirBeamBluetooth } from './useAirBeamBluetooth';
import { usePMScanBluetooth } from './usePMScanBluetooth';

export function useBluetooth() {
  const { sensorType } = useSensor();
  
  // Always call both hooks to maintain hook order consistency
  const airBeam = useAirBeamBluetooth();
  const pmScan = usePMScanBluetooth();

  // Return the appropriate hook based on sensor type
  if (sensorType === 'airBeam') {
    return airBeam;
  } else {
    return pmScan;
  }
}
