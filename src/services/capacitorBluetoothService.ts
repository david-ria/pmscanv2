// src/services/capacitorBluetoothService.ts
// Service Bluetooth Capacitor avec scan large et filtrage par nom

import { BleClient, ScanMode, ScanResult } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
  rssi: number;
  sensorType: 'pmscan' | 'airbeam' | 'atmotube';
}

// Noms de capteurs valides pour le filtrage
const SENSOR_NAME_PATTERNS = {
  pmscan: ['pmscan'],
  airbeam: ['airbeam'],
  atmotube: ['atmotube']
} as const;

type SensorType = keyof typeof SENSOR_NAME_PATTERNS;

/**
 * Identifie le type de capteur à partir du nom de l'appareil
 */
function identifySensorType(deviceName: string | undefined): SensorType | null {
  if (!deviceName) return null;
  
  const nameLower = deviceName.toLowerCase();
  
  for (const [sensorType, patterns] of Object.entries(SENSOR_NAME_PATTERNS)) {
    if (patterns.some(pattern => nameLower.includes(pattern))) {
      return sensorType as SensorType;
    }
  }
  
  return null;
}

/**
 * Service Bluetooth Capacitor pour le scan et la connexion aux capteurs
 */
class CapacitorBluetoothService {
  private isInitialized = false;
  private isScanning = false;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private scanCallback: ((devices: DiscoveredDevice[]) => void) | null = null;

  /**
   * Initialise le client Bluetooth et demande les permissions
   */
  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      logger.debug('📱 Bluetooth: Not a native platform, skipping Capacitor initialization');
      return false;
    }

    try {
      // Étape 1: Initialiser BleClient
      logger.debug('🔌 Bluetooth: Initializing BleClient...');
      await BleClient.initialize();
      
      // Étape 2: Demander l'activation du Bluetooth
      logger.debug('🔌 Bluetooth: Requesting Bluetooth enable...');
      await BleClient.requestEnable();
      
      // Étape 3: Vérifier si Bluetooth est activé
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        logger.warn('⚠️ Bluetooth: Not enabled after request');
        return false;
      }
      
      this.isInitialized = true;
      logger.debug('✅ Bluetooth: Initialized and enabled');
      return true;
      
    } catch (error) {
      logger.error('❌ Bluetooth initialization failed:', error);
      return false;
    }
  }

  /**
   * Démarre un scan large (sans filtres UUID) avec filtrage logiciel par nom
   */
  async startScan(onDeviceFound: (devices: DiscoveredDevice[]) => void): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      logger.debug('📱 Bluetooth: Web platform - use Web Bluetooth API instead');
      return;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Bluetooth initialization failed');
      }
    }

    if (this.isScanning) {
      logger.debug('⚠️ Bluetooth: Scan already in progress');
      return;
    }

    // Réinitialiser les appareils découverts
    this.discoveredDevices.clear();
    this.scanCallback = onDeviceFound;
    this.isScanning = true;

    logger.debug('🔍 Bluetooth: Starting WIDE SCAN (no service filters)...');

    try {
      await BleClient.requestLEScan(
        {
          // SCAN LARGE OBLIGATOIRE - pas de filtrage par service UUID
          services: [],
          // Permettre les doublons pour détecter les changements de RSSI
          allowDuplicates: true,
          // Mode scan à faible latence pour une découverte rapide
          scanMode: ScanMode.SCAN_MODE_LOW_LATENCY
        },
        (result: ScanResult) => {
          this.handleScanResult(result);
        }
      );

      logger.debug('✅ Bluetooth: Wide scan started successfully');

    } catch (error) {
      this.isScanning = false;
      logger.error('❌ Bluetooth scan failed:', error);
      throw error;
    }
  }

  /**
   * Gère les résultats du scan avec filtrage logiciel par nom
   */
  private handleScanResult(result: ScanResult): void {
    const { device, rssi } = result;
    const deviceName = device.name;

    // FILTRAGE LOGICIEL PAR NOM (insensible à la casse)
    const sensorType = identifySensorType(deviceName);
    
    if (sensorType && deviceName) {
      // Appareil valide trouvé!
      const discoveredDevice: DiscoveredDevice = {
        deviceId: device.deviceId,
        name: deviceName,
        rssi: rssi ?? -100,
        sensorType
      };

      // Ajouter ou mettre à jour dans la map (dédupliqué par deviceId)
      const existingDevice = this.discoveredDevices.get(device.deviceId);
      if (!existingDevice || existingDevice.rssi < discoveredDevice.rssi) {
        this.discoveredDevices.set(device.deviceId, discoveredDevice);
        
        logger.debug(`📡 Sensor found: ${deviceName} (${sensorType}) RSSI: ${rssi}`);

        // Notifier le callback avec tous les appareils découverts
        if (this.scanCallback) {
          this.scanCallback(Array.from(this.discoveredDevices.values()));
        }
      }
    }
  }

  /**
   * Arrête le scan Bluetooth
   */
  async stopScan(): Promise<void> {
    if (!this.isScanning) {
      return;
    }

    try {
      await BleClient.stopLEScan();
      this.isScanning = false;
      logger.debug('🛑 Bluetooth: Scan stopped');
    } catch (error) {
      logger.error('❌ Error stopping scan:', error);
    }
  }

  /**
   * Connecte à un appareil spécifique
   */
  async connect(deviceId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Capacitor Bluetooth not available on web');
    }

    logger.debug(`🔗 Bluetooth: Connecting to ${deviceId}...`);
    
    try {
      await BleClient.connect(deviceId, (disconnectedDeviceId) => {
        logger.debug(`🔌 Device disconnected: ${disconnectedDeviceId}`);
      });
      
      logger.debug(`✅ Bluetooth: Connected to ${deviceId}`);
    } catch (error) {
      logger.error(`❌ Bluetooth connection failed:`, error);
      throw error;
    }
  }

  /**
   * Déconnecte d'un appareil
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      await BleClient.disconnect(deviceId);
      logger.debug(`🔌 Bluetooth: Disconnected from ${deviceId}`);
    } catch (error) {
      logger.error(`❌ Error disconnecting:`, error);
    }
  }

  /**
   * Retourne les appareils découverts
   */
  getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Vérifie si on est sur une plateforme native
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * État du scan
   */
  get scanning(): boolean {
    return this.isScanning;
  }
}

// Export singleton instance
export const capacitorBluetoothService = new CapacitorBluetoothService();
