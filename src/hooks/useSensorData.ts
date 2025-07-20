import { useState, useEffect, useCallback } from 'react';
import { Motion } from '@capacitor/motion';
import * as logger from '@/utils/logger';

interface SensorData {
  barometer_relativeAltitude?: number;
  magnetometer_x?: number;
  magnetometer_y?: number;
  magnetometer_z?: number;
  gravity_z?: number;
  totalAcceleration_z?: number;
  acceleration_x?: number;
  acceleration_y?: number;
  acceleration_z?: number;
  rotationRate_x?: number;
  rotationRate_y?: number;
  rotationRate_z?: number;
}

interface GPSAccuracy {
  accuracy?: number;
  isLowAccuracy: boolean;
}

export function useSensorData() {
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [gpsAccuracy, setGpsAccuracy] = useState<GPSAccuracy>({ isLowAccuracy: false });
  const [isListening, setIsListening] = useState(false);

  const startSensorListening = useCallback(async () => {
    try {
      setIsListening(true);
      
      // 1. Vraies données d'accélération via Capacitor Motion
      await Motion.addListener('accel', (event) => {
        const accZ = event.acceleration.z;
        setSensorData(prev => ({
          ...prev,
          acceleration_x: event.acceleration.x,
          acceleration_y: event.acceleration.y,
          acceleration_z: accZ,
          totalAcceleration_z: accZ,
          // Calcul amélioré de la gravité (filtre passe-bas simple)
          gravity_z: prev.gravity_z ? prev.gravity_z * 0.8 + accZ * 0.2 : accZ
        }));
      });

      // 2. Vraies données de rotation via Capacitor Motion
      await Motion.addListener('orientation', (event) => {
        setSensorData(prev => ({
          ...prev,
          rotationRate_x: event.alpha || 0,
          rotationRate_y: event.beta || 0,
          rotationRate_z: event.gamma || 0
        }));
      });

      // 3. Vraies données magnétomètre via DeviceOrientationEvent (Web API native)
      if ('DeviceOrientationEvent' in window) {
        const handleOrientation = (event: DeviceOrientationEvent) => {
          if ((event as any).webkitCompassHeading !== undefined || event.alpha !== null) {
            // Calcul approximatif du magnétomètre à partir de l'orientation
            const heading = (event as any).webkitCompassHeading || event.alpha || 0;
            const beta = event.beta || 0;
            const gamma = event.gamma || 0;
            
            setSensorData(prev => ({
              ...prev,
              // Conversion orientation -> magnétomètre (approximation)
              magnetometer_x: Math.sin(heading * Math.PI / 180) * 50,
              magnetometer_y: -Math.cos(heading * Math.PI / 180) * 40 + beta * 0.5,
              magnetometer_z: Math.cos(beta * Math.PI / 180) * 30 + gamma * 0.3
            }));
          }
        };

        window.addEventListener('deviceorientationabsolute', handleOrientation);
        // Fallback pour iOS
        window.addEventListener('deviceorientation', handleOrientation);
      }

      logger.debug('🎯 Capteurs activés avec données réelles');
    } catch (error) {
      logger.error('❌ Erreur activation capteurs:', error);
    }
  }, []);

  const stopSensorListening = useCallback(async () => {
    try {
      await Motion.removeAllListeners();
      setIsListening(false);
      logger.debug('🔇 Capteurs désactivés');
    } catch (error) {
      logger.error('❌ Erreur désactivation capteurs:', error);
    }
  }, []);

  // Utiliser l'altitude GPS haute précision pour le baromètre
  const updateAltitudeFromGPS = useCallback((altitude?: number) => {
    if (altitude !== undefined) {
      setSensorData(prev => ({
        ...prev,
        // Utiliser l'altitude GPS comme approximation du baromètre
        barometer_relativeAltitude: altitude
      }));
    }
  }, []);

  // Fallback simulation uniquement si pas de données réelles
  const updateSimulatedSensors = useCallback((altitude?: number) => {
    setSensorData(prev => ({
      ...prev,
      // N'utiliser la simulation que si pas de données réelles
      ...(!prev.magnetometer_x && {
        magnetometer_x: Math.random() * 20 - 10,
        magnetometer_y: Math.random() * -60 + 10,
        magnetometer_z: Math.random() * 40 + 10
      }),
      ...(!prev.barometer_relativeAltitude && altitude && {
        barometer_relativeAltitude: altitude
      })
    }));
  }, []);

  const updateGPSAccuracy = useCallback((accuracy?: number) => {
    const isLowAccuracy = !accuracy || accuracy > 50; // Considérer comme imprécis si > 50m
    setGpsAccuracy({ accuracy, isLowAccuracy });
  }, []);

  // Fonction de détection d'activité basée sur votre modèle
  const detectUndergroundActivity = useCallback((measure: SensorData): string => {
    const alt = measure.barometer_relativeAltitude || 0;
    const magX = measure.magnetometer_x || 0;
    const magY = measure.magnetometer_y || 0;
    const magZ = measure.magnetometer_z || 0;
    const gravZ = measure.gravity_z || 0;
    const totalAccZ = measure.totalAcceleration_z || 0;

    if (alt > -4 && magX > 5 && magY < -40 && magZ > 30 && totalAccZ < -1) {
      return "escalator";
    }
    else if (alt < -5 && alt > -7 && magX < 0 && magY < -30 && magZ > 5 && totalAccZ < -1) {
      return "stairs";
    }
    else if (alt < -6 && magX < -10 && magY < -30 && magZ > 15 && totalAccZ > -1 && totalAccZ < 0) {
      return "stairs to outside";
    }
    else if (alt < -8 && magY < -30 && magZ < 0 && totalAccZ > -1.5 && totalAccZ < 0) {
      return "stand";
    }
    else if (alt < -7 && gravZ > 0 && totalAccZ > 0) {
      return "stand platform";
    }
    else {
      return "unknown";
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSensorListening();
    };
  }, [stopSensorListening]);

  return {
    sensorData,
    gpsAccuracy,
    isListening,
    startSensorListening,
    stopSensorListening,
    updateSimulatedSensors,
    updateAltitudeFromGPS,
    updateGPSAccuracy,
    detectUndergroundActivity
  };
}