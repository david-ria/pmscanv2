import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import * as logger from '@/utils/logger';

// Timeout constants
export const BLE_TIMEOUTS = {
  CONNECT: 10000,
  READ: 5000,
  WRITE: 5000,
  START_NOTIFICATIONS: 8000,
  OPERATION_DEFAULT: 5000,
} as const;

// Retry configuration
export const BLE_RETRY_CONFIG = {
  CONNECT_ATTEMPTS: 3,
  OPERATION_ATTEMPTS: 2,
  NOTIFICATION_ATTEMPTS: 2,
  BASE_DELAY: 1000,
  MAX_DELAY: 5000,
} as const;

// Error types that should not be retried
const NON_RETRYABLE_ERRORS = [
  'user cancelled',
  'permission denied',
  'bluetooth disabled',
  'device not found',
] as const;

/**
 * Centralized BLE operation wrapper with timeout and retry support
 */
export class BleOperationWrapper {
  /**
   * Execute operation with timeout
   */
  private static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const startTime = Date.now();
    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      const duration = Date.now() - startTime;
      logger.debug(`✅ ${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ ${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Check if error should be retried
   */
  private static shouldRetry(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return !NON_RETRYABLE_ERRORS.some(nonRetryable => 
      errorMessage.includes(nonRetryable)
    );
  }

  /**
   * Execute operation with retry logic
   */
  private static async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number,
    operationName: string,
    baseDelay: number = BLE_RETRY_CONFIG.BASE_DELAY
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          logger.debug(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === attempts || !this.shouldRetry(error)) {
          throw error;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), BLE_RETRY_CONFIG.MAX_DELAY);
        logger.debug(`🔄 ${operationName} failed (attempt ${attempt}/${attempts}), retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Execute operation with both timeout and retry
   */
  private static async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeoutMs: number,
    retryAttempts: number = 1
  ): Promise<T> {
    const operationWithTimeout = () => 
      this.withTimeout(operation, timeoutMs, operationName);

    if (retryAttempts > 1) {
      return this.withRetry(operationWithTimeout, retryAttempts, operationName);
    }

    return operationWithTimeout();
  }

  /**
   * Connect to device with timeout and retry
   */
  public static async connect(
    device: BluetoothDevice | string
  ): Promise<BluetoothRemoteGATTServer | void> {
    if (Capacitor.isNativePlatform()) {
      const deviceId = device as string;
      return this.executeOperation(
        () => BleClient.connect(deviceId),
        `Native connect to ${deviceId.slice(-8)}`,
        BLE_TIMEOUTS.CONNECT,
        BLE_RETRY_CONFIG.CONNECT_ATTEMPTS
      );
    }

    const bluetoothDevice = device as BluetoothDevice;
    return this.executeOperation(
      () => bluetoothDevice.gatt!.connect(),
      `Web connect to ${bluetoothDevice.name}`,
      BLE_TIMEOUTS.CONNECT,
      BLE_RETRY_CONFIG.CONNECT_ATTEMPTS
    );
  }

  /**
   * Read characteristic with timeout and retry
   */
  public static async read(
    deviceIdOrCharacteristic: string | BluetoothRemoteGATTCharacteristic,
    serviceUuid?: string,
    characteristicUuid?: string
  ): Promise<DataView> {
    if (Capacitor.isNativePlatform()) {
      const deviceId = deviceIdOrCharacteristic as string;
      const result = await this.executeOperation(
        () => BleClient.read(deviceId, serviceUuid!, characteristicUuid!),
        `Native read ${characteristicUuid?.slice(-8)}`,
        BLE_TIMEOUTS.READ,
        BLE_RETRY_CONFIG.OPERATION_ATTEMPTS
      );
      return new DataView(result.buffer);
    }

    const characteristic = deviceIdOrCharacteristic as BluetoothRemoteGATTCharacteristic;
    return this.executeOperation(
      () => characteristic.readValue(),
      `Web read ${characteristic.uuid.slice(-8)}`,
      BLE_TIMEOUTS.READ,
      BLE_RETRY_CONFIG.OPERATION_ATTEMPTS
    );
  }

  /**
   * Write characteristic with timeout and retry
   */
  public static async write(
    deviceIdOrCharacteristic: string | BluetoothRemoteGATTCharacteristic,
    data: Uint8Array | DataView,
    serviceUuid?: string,
    characteristicUuid?: string
  ): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const deviceId = deviceIdOrCharacteristic as string;
      const dataView = data instanceof Uint8Array ? new DataView(data.buffer) : data;
      return this.executeOperation(
        () => BleClient.write(deviceId, serviceUuid!, characteristicUuid!, dataView),
        `Native write ${characteristicUuid?.slice(-8)}`,
        BLE_TIMEOUTS.WRITE,
        BLE_RETRY_CONFIG.OPERATION_ATTEMPTS
      );
    }

    const characteristic = deviceIdOrCharacteristic as BluetoothRemoteGATTCharacteristic;
    const uint8Array = data instanceof DataView ? new Uint8Array(data.buffer) : data;
    return this.executeOperation(
      () => characteristic.writeValueWithResponse(uint8Array),
      `Web write ${characteristic.uuid.slice(-8)}`,
      BLE_TIMEOUTS.WRITE,
      BLE_RETRY_CONFIG.OPERATION_ATTEMPTS
    );
  }

  /**
   * Start notifications with timeout and retry
   */
  public static async startNotifications(
    deviceIdOrCharacteristic: string | BluetoothRemoteGATTCharacteristic,
    callback: (value: DataView) => void,
    serviceUuid?: string,
    characteristicUuid?: string
  ): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const deviceId = deviceIdOrCharacteristic as string;
      return this.executeOperation(
        () => BleClient.startNotifications(
          deviceId,
          serviceUuid!,
          characteristicUuid!,
          callback
        ),
        `Native notifications ${characteristicUuid?.slice(-8)}`,
        BLE_TIMEOUTS.START_NOTIFICATIONS,
        BLE_RETRY_CONFIG.NOTIFICATION_ATTEMPTS
      );
    }

    const characteristic = deviceIdOrCharacteristic as BluetoothRemoteGATTCharacteristic;
    return this.executeOperation(
      async () => {
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          callback(event.target.value);
        });
      },
      `Web notifications ${characteristic.uuid.slice(-8)}`,
      BLE_TIMEOUTS.START_NOTIFICATIONS,
      BLE_RETRY_CONFIG.NOTIFICATION_ATTEMPTS
    );
  }

  /**
   * Get service with timeout
   */
  public static async getService(
    server: BluetoothRemoteGATTServer,
    serviceUuid: string
  ): Promise<BluetoothRemoteGATTService> {
    return this.executeOperation(
      () => server.getPrimaryService(serviceUuid),
      `Get service ${serviceUuid.slice(-8)}`,
      BLE_TIMEOUTS.OPERATION_DEFAULT
    );
  }

  /**
   * Get characteristic with timeout
   */
  public static async getCharacteristic(
    service: BluetoothRemoteGATTService,
    characteristicUuid: string
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    return this.executeOperation(
      () => service.getCharacteristic(characteristicUuid),
      `Get characteristic ${characteristicUuid.slice(-8)}`,
      BLE_TIMEOUTS.OPERATION_DEFAULT
    );
  }
}