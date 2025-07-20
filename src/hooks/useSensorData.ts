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
      
      // Écouter les données d'accélération et de gyroscope
      await Motion.addListener('accel', (event) => {
        setSensorData(prev => ({
          ...prev,
          acceleration_x: event.acceleration.x,
          acceleration_y: event.acceleration.y,
          acceleration_z: event.acceleration.z,
          // Calculer l'accélération totale en Z (approximation)
          totalAcceleration_z: event.acceleration.z,
          // Approximation de la gravité (en réalité plus complexe)
          gravity_z: event.acceleration.z > 0 ? event.acceleration.z : 0
        }));
      });

      // Écouter les données de rotation
      await Motion.addListener('orientation', (event) => {
        setSensorData(prev => ({
          ...prev,
          rotationRate_x: event.alpha || 0,
          rotationRate_y: event.beta || 0,
          rotationRate_z: event.gamma || 0
        }));
      });

      logger.debug('🎯 Capteurs activés');
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

  // Simuler le baromètre et magnétomètre (à remplacer par de vraies valeurs si disponibles)
  const updateSimulatedSensors = useCallback((altitude?: number) => {
    setSensorData(prev => ({
      ...prev,
      // Simulation basée sur l'altitude GPS
      barometer_relativeAltitude: altitude || prev.barometer_relativeAltitude || 0,
      // Simulation du magnétomètre (valeurs typiques)
      magnetometer_x: Math.random() * 20 - 10,
      magnetometer_y: Math.random() * -60 + 10,
      magnetometer_z: Math.random() * 40 + 10
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
    updateGPSAccuracy,
    detectUndergroundActivity
  };
}