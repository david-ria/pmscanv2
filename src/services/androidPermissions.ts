// Permission types for Android BLE
import { AndroidInfo } from '../hooks/useAndroidApiLevel';

export interface PermissionRequest {
  permission: string;
  required: boolean;
  description: string;
  fallbackMessage?: string;
}

export class AndroidPermissionManager {
  static getRequiredPermissions(androidInfo: AndroidInfo): PermissionRequest[] {
    const permissions: PermissionRequest[] = [];

    if (!androidInfo.isAndroid) {
      return permissions;
    }

    // API 31+ (Android 12+) - New BLE permissions
    if (androidInfo.apiLevel >= 31) {
      permissions.push(
        {
          permission: 'android.permission.BLUETOOTH_SCAN',
          required: true,
          description: 'Required to scan for BLE devices (Android 12+)',
        },
        {
          permission: 'android.permission.BLUETOOTH_CONNECT',
          required: true,
          description: 'Required to connect to BLE devices (Android 12+)',
        },
        {
          permission: 'android.permission.BLUETOOTH_ADVERTISE',
          required: false,
          description: 'Required for BLE advertising (Android 12+)',
        }
      );
    }

    // API 23-30 - Location permission for BLE
    if (androidInfo.apiLevel >= 23 && androidInfo.apiLevel < 31) {
      permissions.push({
        permission: 'android.permission.ACCESS_FINE_LOCATION',
        required: true,
        description: 'Required for BLE scanning (Android 6-11)',
        fallbackMessage: 'Location is needed for Bluetooth scanning, not for tracking your location'
      });
    }

    // API 29+ - Background location
    if (androidInfo.apiLevel >= 29) {
      permissions.push({
        permission: 'android.permission.ACCESS_BACKGROUND_LOCATION',
        required: false,
        description: 'Required for background BLE operations (Android 10+)',
        fallbackMessage: 'Background location allows the app to maintain BLE connections when minimized'
      });
    }

    return permissions;
  }

  static getBrandSpecificInstructions(brand: string): string[] {
    const instructions: string[] = [];
    
    switch (brand.toLowerCase()) {
      case 'samsung':
        instructions.push(
          'Disable battery optimization for PMScan in Device Care',
          'Enable "Allow background activity" in App settings',
          'Turn off "Put unused apps to sleep"'
        );
        break;
      
      case 'xiaomi':
        instructions.push(
          'Enable "Autostart" for PMScan in Security app',
          'Disable battery optimization in Settings > Apps > Manage apps',
          'Set Battery saver to "No restrictions"',
          'Enable "Display pop-up windows while running in background"'
        );
        break;
      
      case 'google':
        instructions.push(
          'Disable Adaptive Battery for PMScan',
          'Allow background activity in App settings',
          'Exclude from battery optimization'
        );
        break;
      
      default:
        instructions.push(
          'Disable battery optimization for PMScan',
          'Allow background activity',
          'Check manufacturer-specific power management settings'
        );
    }
    
    return instructions;
  }

  static async checkPermissionCompatibility(): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check if BLE is available
      const bleAvailable = 'bluetooth' in navigator;
      if (!bleAvailable) {
        issues.push('Bluetooth Low Energy not available on this device');
      }

      // Check permissions status would go here
      // This is a placeholder for more detailed permission checking
      
      recommendations.push('Test BLE functionality thoroughly on this device model');
      
      return {
        compatible: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      issues.push(`Permission check failed: ${error}`);
      return { compatible: false, issues, recommendations };
    }
  }
}