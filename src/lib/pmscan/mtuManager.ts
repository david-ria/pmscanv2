import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

/**
 * MTU configuration and limits
 */
export const MTU_CONFIG = {
  DEFAULT: 23 as number,          // Default MTU for BLE
  PREFERRED: 512 as number,       // Preferred MTU size
  MIN_EFFECTIVE: 20 as number,    // Minimum effective payload (MTU - 3)
  NEGOTIATION_TIMEOUT: 5000 as number,
} as const;

export interface MtuInfo {
  negotiated: number;
  effective: number;    // MTU - 3 bytes (for BLE overhead)
  isOptimal: boolean;   // Whether we got our preferred MTU
  supportsExtended: boolean; // Whether extended data fits without fragmentation
}

/**
 * Unified MTU manager for both native and web platforms
 */
export class MtuManager {
  private static currentMtu: MtuInfo | null = null;

  /**
   * Negotiate MTU with device after connection
   */
  public static async negotiateMtu(
    deviceIdOrServer: string | BluetoothRemoteGATTServer
  ): Promise<MtuInfo> {
    try {
      let negotiatedMtu = MTU_CONFIG.DEFAULT;

      if (Capacitor.isNativePlatform()) {
        const deviceId = deviceIdOrServer as string;
        logger.debug(`📡 Negotiating MTU for native device ${deviceId.slice(-8)}...`);
        
        try {
          // Note: Check if MTU request is available (newer versions of the plugin)
          // For now, we simulate MTU negotiation on Android by assuming success
          // In real implementation, this would use the native MTU request
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate negotiation delay
          
          // Common negotiated MTU on Android devices is around 185-247 bytes
          negotiatedMtu = 185; // Conservative estimate for Android
          logger.debug(`✅ MTU negotiation simulated, using ${negotiatedMtu} bytes`);
        } catch (error) {
          logger.warn('⚠️ MTU negotiation failed, using default:', error);
          negotiatedMtu = MTU_CONFIG.DEFAULT;
        }
      } else {
        // Web Bluetooth doesn't support MTU negotiation
        // We're stuck with the default MTU (23 bytes)
        logger.debug('📡 Web platform: Using default MTU (no negotiation available)');
        negotiatedMtu = MTU_CONFIG.DEFAULT;
      }

      const mtuInfo = this.createMtuInfo(negotiatedMtu);
      this.currentMtu = mtuInfo;
      
      this.logMtuInfo(mtuInfo);
      return mtuInfo;
    } catch (error) {
      logger.error('❌ MTU negotiation error:', error);
      const fallbackMtu = this.createMtuInfo(MTU_CONFIG.DEFAULT);
      this.currentMtu = fallbackMtu;
      return fallbackMtu;
    }
  }

  /**
   * Get current MTU information
   */
  public static getCurrentMtu(): MtuInfo | null {
    return this.currentMtu;
  }

  /**
   * Check if data size fits within current MTU without fragmentation
   */
  public static canSendWithoutFragmentation(dataSize: number): boolean {
    if (!this.currentMtu) return false;
    return dataSize <= this.currentMtu.effective;
  }

  /**
   * Calculate number of fragments needed for data
   */
  public static calculateFragments(dataSize: number): number {
    if (!this.currentMtu) return Math.ceil(dataSize / MTU_CONFIG.MIN_EFFECTIVE);
    return Math.ceil(dataSize / this.currentMtu.effective);
  }

  /**
   * Get optimal chunk size for data transmission
   */
  public static getOptimalChunkSize(): number {
    return this.currentMtu?.effective || MTU_CONFIG.MIN_EFFECTIVE;
  }

  /**
   * Reset MTU information (on disconnect)
   */
  public static reset(): void {
    this.currentMtu = null;
    logger.debug('🔄 MTU information reset');
  }

  /**
   * Create MTU info object with calculated values
   */
  private static createMtuInfo(negotiatedMtu: number): MtuInfo {
    const effective = negotiatedMtu - 3; // BLE overhead
    const isOptimal = negotiatedMtu >= MTU_CONFIG.PREFERRED;
    const supportsExtended = effective >= 150; // Typical extended data size

    return {
      negotiated: negotiatedMtu,
      effective,
      isOptimal,
      supportsExtended
    };
  }

  /**
   * Log MTU information with performance implications
   */
  private static logMtuInfo(mtuInfo: MtuInfo): void {
    const status = mtuInfo.isOptimal ? '🚀' : '⚠️';
    const fragmentation = mtuInfo.supportsExtended ? '✅ No fragmentation' : '📦 Fragmentation needed';
    
    logger.debug(`${status} MTU: ${mtuInfo.negotiated} bytes (${mtuInfo.effective} effective)`);
    logger.debug(`📊 Performance: ${fragmentation} for extended data`);
    
    if (!mtuInfo.isOptimal) {
      logger.warn('⚠️ Sub-optimal MTU may impact performance for large data transfers');
    }
  }
}

/**
 * Fragment manager for handling large data transfers
 */
export class FragmentManager {
  private static fragmentBuffer = new Map<string, {
    expectedSize: number;
    receivedSize: number;
    fragments: Uint8Array[];
    timestamp: number;
  }>();

  private static readonly FRAGMENT_TIMEOUT = 5000; // 5 seconds

  /**
   * Process incoming notification data, handling fragmentation
   */
  public static processNotification(
    characteristicUuid: string,
    data: DataView,
    onComplete: (assembledData: Uint8Array) => void
  ): void {
    const dataArray = new Uint8Array(data.buffer);
    
    // Check if this looks like a fragment (simple heuristic)
    if (this.isFragment(dataArray)) {
      this.handleFragment(characteristicUuid, dataArray, onComplete);
    } else {
      // Complete data, process immediately
      onComplete(dataArray);
    }
  }

  /**
   * Clean up expired fragments
   */
  public static cleanupExpiredFragments(): void {
    const now = Date.now();
    for (const [key, fragment] of this.fragmentBuffer.entries()) {
      if (now - fragment.timestamp > this.FRAGMENT_TIMEOUT) {
        logger.warn(`🗑️ Removing expired fragment for ${key}`);
        this.fragmentBuffer.delete(key);
      }
    }
  }

  /**
   * Simple heuristic to detect if data might be a fragment
   */
  private static isFragment(data: Uint8Array): boolean {
    // PMScan base packets are typically 18 bytes
    // If we have exactly the MTU effective size, it might be a fragment
    const mtu = MtuManager.getCurrentMtu();
    if (!mtu) return false;
    
    return data.length === mtu.effective && data.length >= 18;
  }

  /**
   * Handle fragmented data
   */
  private static handleFragment(
    characteristicUuid: string,
    fragment: Uint8Array,
    onComplete: (assembledData: Uint8Array) => void
  ): void {
    const key = characteristicUuid;
    
    if (!this.fragmentBuffer.has(key)) {
      // First fragment, initialize buffer
      this.fragmentBuffer.set(key, {
        expectedSize: -1, // Unknown for now
        receivedSize: fragment.length,
        fragments: [fragment],
        timestamp: Date.now()
      });
      logger.debug(`📦 Started fragment assembly for ${key.slice(-8)}`);
    } else {
      // Additional fragment
      const buffer = this.fragmentBuffer.get(key)!;
      buffer.fragments.push(fragment);
      buffer.receivedSize += fragment.length;
      buffer.timestamp = Date.now();
      
      // Simple completion heuristic: if fragment is smaller than MTU, it's likely the last
      const mtu = MtuManager.getCurrentMtu();
      if (mtu && fragment.length < mtu.effective) {
        // Assemble complete data
        const totalSize = buffer.receivedSize;
        const assembled = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const frag of buffer.fragments) {
          assembled.set(frag, offset);
          offset += frag.length;
        }
        
        logger.debug(`✅ Fragment assembly complete: ${buffer.fragments.length} fragments, ${totalSize} bytes`);
        this.fragmentBuffer.delete(key);
        onComplete(assembled);
      }
    }
  }
}