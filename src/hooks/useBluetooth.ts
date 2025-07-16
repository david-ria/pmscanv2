import { useSensor } from '@/contexts/SensorContext';
import { useAirBeamBluetooth } from './useAirBeamBluetooth';
import { usePMScanBluetooth } from './usePMScanBluetooth';

export function useBluetooth() {
  const { sensorType } = useSensor();
  const airBeam = useAirBeamBluetooth();
  const pmScan = usePMScanBluetooth();

  return sensorType === 'airBeam' ? airBeam : pmScan;
}
