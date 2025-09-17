import { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

export interface AndroidInfo {
  apiLevel: number;
  brand: string;
  model: string;
  version: string;
  isAndroid: boolean;
}

export const useAndroidApiLevel = () => {
  const [androidInfo, setAndroidInfo] = useState<AndroidInfo>({
    apiLevel: 0,
    brand: 'unknown',
    model: 'unknown',
    version: 'unknown',
    isAndroid: false
  });

  useEffect(() => {
    const getDeviceInfo = async () => {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
        return;
      }

      try {
        const info = await Device.getInfo();
        const apiLevel = parseInt(info.osVersion) || 0;
        
        setAndroidInfo({
          apiLevel,
          brand: info.manufacturer || 'unknown',
          model: info.model || 'unknown',
          version: info.osVersion || 'unknown',
          isAndroid: true
        });
      } catch (error) {
        console.error('Failed to get Android device info:', error);
      }
    };

    getDeviceInfo();
  }, []);

  const needsNewBlePermissions = androidInfo.apiLevel >= 31; // Android 12+
  const needsLocationPermission = androidInfo.apiLevel >= 23 && androidInfo.apiLevel < 31;
  const needsBackgroundLocation = androidInfo.apiLevel >= 29; // Android 10+
  const hasScoppedStorage = androidInfo.apiLevel >= 30; // Android 11+

  return {
    ...androidInfo,
    needsNewBlePermissions,
    needsLocationPermission,
    needsBackgroundLocation,
    hasScoppedStorage,
    isKnownProblematicBrand: ['xiaomi', 'huawei', 'oppo', 'vivo'].includes(androidInfo.brand.toLowerCase())
  };
};