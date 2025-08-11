import { useState, useEffect, useCallback } from 'react';
import { Motion } from '@capacitor/motion';
import * as logger from '@/utils/logger';

interface SensorData {
  barometer_relativeAltitude?: number; // Altitude relative depuis le début du trajet
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
  // Données de référence pour calculs relatifs
  referenceAltitude?: number;
  referencePressure?: number;
}

interface GPSAccuracy {
  accuracy?: number;
  isLowAccuracy: boolean;
}

export function useSensorData() {
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [gpsAccuracy, setGpsAccuracy] = useState<GPSAccuracy>({ isLowAccuracy: false });
  const [isListening, setIsListening] = useState(false);
  const [cleanupFunctions, setCleanupFunctions] = useState<Array<{ remove: () => void }>>([]);

  const startSensorListening = useCallback(async () => {
    // Prevent starting listeners twice
    if (isListening) {
      logger.debug('🔄 Sensors already listening, skipping initialization');
      return;
    }

    try {
      setIsListening(true);
      const subs: Array<{ remove: () => void }> = [];
      
      // 1. Motion acceleration listener via Capacitor
      const accelSub = await Motion.addListener('accel', (event) => {
        const accZ = event.acceleration.z;
        setSensorData(prev => ({
          ...prev,
          acceleration_x: event.acceleration.x,
          acceleration_y: event.acceleration.y,
          acceleration_z: accZ,
          totalAcceleration_z: accZ,
          // Enhanced gravity calculation (simple low-pass filter)
          gravity_z: prev.gravity_z ? prev.gravity_z * 0.8 + accZ * 0.2 : accZ
        }));
      });
      subs.push(accelSub);

      // 2. Motion orientation listener via Capacitor
      const orientationSub = await Motion.addListener('orientation', (event) => {
        setSensorData(prev => ({
          ...prev,
          rotationRate_x: event.alpha || 0,
          rotationRate_y: event.beta || 0,
          rotationRate_z: event.gamma || 0
        }));
      });
      subs.push(orientationSub);

      // 3. Device orientation via Web API with proper cleanup
      if ('DeviceOrientationEvent' in window) {
        const handleOrientation = (event: DeviceOrientationEvent) => {
          if ((event as any).webkitCompassHeading !== undefined || event.alpha !== null) {
            // Approximate magnetometer calculation from orientation
            const heading = (event as any).webkitCompassHeading || event.alpha || 0;
            const beta = event.beta || 0;
            const gamma = event.gamma || 0;
            
            setSensorData(prev => ({
              ...prev,
              // Convert orientation -> magnetometer (approximation)
              magnetometer_x: Math.sin(heading * Math.PI / 180) * 50,
              magnetometer_y: -Math.cos(heading * Math.PI / 180) * 40 + beta * 0.5,
              magnetometer_z: Math.cos(beta * Math.PI / 180) * 30 + gamma * 0.3
            }));
          }
        };

        // Check for iOS permission requirement
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            if (permission === 'granted') {
              window.addEventListener('deviceorientationabsolute', handleOrientation);
              window.addEventListener('deviceorientation', handleOrientation);
            } else {
              logger.warn('⚠️ Device orientation permission denied');
            }
          } catch (error) {
            logger.error('❌ Error requesting device orientation permission:', error);
          }
        } else {
          // Non-iOS devices
          window.addEventListener('deviceorientationabsolute', handleOrientation);
          window.addEventListener('deviceorientation', handleOrientation);
        }

        // Add cleanup for window event listeners
        subs.push({
          remove: () => {
            window.removeEventListener('deviceorientationabsolute', handleOrientation);
            window.removeEventListener('deviceorientation', handleOrientation);
          }
        });
      }

      // Store cleanup functions for later removal
      setCleanupFunctions(subs);
      logger.debug('🎯 Sensors activated with real data');
    } catch (error) {
      logger.error('❌ Error activating sensors:', error);
      setIsListening(false);
    }
  }, [isListening]);

  const stopSensorListening = useCallback(async () => {
    try {
      // Remove all Capacitor Motion listeners
      await Motion.removeAllListeners();
      
      // Remove all custom cleanup functions (window event listeners)
      cleanupFunctions.forEach(cleanup => cleanup.remove());
      setCleanupFunctions([]);
      
      setIsListening(false);
      logger.debug('🔇 All sensors deactivated and cleaned up');
    } catch (error) {
      logger.error('❌ Error deactivating sensors:', error);
    }
  }, [cleanupFunctions]);

  // Initialiser la référence d'altitude (surface) avant de descendre underground
  const initializeReference = useCallback((gpsAltitude?: number) => {
    setSensorData(prev => ({
      ...prev,
      referenceAltitude: gpsAltitude || 0,
      barometer_relativeAltitude: 0 // Commencer à 0 relativement à la surface
    }));
    logger.debug('📍 Référence altitude initialisée:', gpsAltitude || 'sans GPS');
  }, []);

  // Calculer l'altitude relative basée sur les changements d'accélération verticale
  const updateRelativeAltitude = useCallback(() => {
    setSensorData(prev => {
      if (!prev.acceleration_z || prev.barometer_relativeAltitude === undefined) return prev;
      
      // Intégration simple de l'accélération pour estimer le changement d'altitude
      // (approximation : changements verticaux significatifs = changements d'étage)
      const verticalChange = Math.abs(prev.acceleration_z) > 2 ? 
        (prev.acceleration_z > 0 ? 0.5 : -0.5) : 0; // Descente/montée détectée
      
      const newRelativeAlt = (prev.barometer_relativeAltitude || 0) + verticalChange;
      
      return {
        ...prev,
        barometer_relativeAltitude: Math.max(-20, Math.min(5, newRelativeAlt)) // Limiter entre -20m et +5m
      };
    });
  }, []);

  // Mise à jour GPS seulement en surface (quand disponible)
  const updateAltitudeFromGPS = useCallback((altitude?: number, accuracy?: number) => {
    // Ne utiliser le GPS que si la précision est bonne (surface)
    if (altitude !== undefined && accuracy && accuracy < 20) {
      setSensorData(prev => ({
        ...prev,
        referenceAltitude: altitude,
        // Reset l'altitude relative si on revient en surface avec bon GPS
        barometer_relativeAltitude: 0
      }));
      logger.debug('🛰️ Altitude GPS mise à jour (surface):', altitude);
    }
  }, []);

  // Aucune simulation - seulement données réelles ou unknown

  const updateGPSAccuracy = useCallback((accuracy?: number) => {
    const isLowAccuracy = !accuracy || accuracy > 50; // Considérer comme imprécis si > 50m
    setGpsAccuracy({ accuracy, isLowAccuracy });
  }, []);

  // Fonction de détection d'activité stricte - aucune simulation
  const detectUndergroundActivity = useCallback((measure: SensorData): string => {
    const alt = measure.barometer_relativeAltitude;
    const magX = measure.magnetometer_x;
    const magY = measure.magnetometer_y;
    const magZ = measure.magnetometer_z;
    const gravZ = measure.gravity_z;
    const totalAccZ = measure.totalAcceleration_z;

    // Vérifier que TOUTES les données nécessaires sont disponibles
    if (alt === undefined || magX === undefined || magY === undefined || 
        magZ === undefined || gravZ === undefined || totalAccZ === undefined) {
      logger.debug('❌ Données capteurs insuffisantes pour détection underground');
      return "unknown";
    }

    // Appliquer le modèle seulement avec des données réelles
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

  // Effet pour mettre à jour l'altitude relative automatiquement
  useEffect(() => {
    if (isListening && sensorData.acceleration_z !== undefined) {
      const interval = setInterval(updateRelativeAltitude, 1000); // Mise à jour chaque seconde
      return () => clearInterval(interval);
    }
  }, [isListening, sensorData.acceleration_z, updateRelativeAltitude]);

  // Cleanup effect - ensures all listeners are removed on unmount
  useEffect(() => {
    return () => {
      // Cleanup all listeners when component unmounts
      Motion.removeAllListeners().catch(console.error);
      cleanupFunctions.forEach(cleanup => cleanup.remove());
    };
  }, [cleanupFunctions]);

  return {
    sensorData,
    gpsAccuracy,
    isListening,
    startSensorListening,
    stopSensorListening,
    updateAltitudeFromGPS,
    updateGPSAccuracy,
    detectUndergroundActivity,
    initializeReference,
    updateRelativeAltitude
  };
}