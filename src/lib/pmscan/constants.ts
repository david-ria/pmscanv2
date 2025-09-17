// PMScan Bluetooth Service UUIDs
export const PMScan_SERVICE_UUID = 'f3641900-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_RT_DATA_UUID = 'f3641901-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_IM_DATA_UUID = 'f3641902-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_OTH_UUID = 'f3641903-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_BATTERY_UUID = 'f3641904-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_CHARGING_UUID = 'f3641905-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_TIME_UUID = 'f3641906-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_INTERVAL_UUID = 'f3641907-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_MODE_UUID = 'f3641908-00b0-4240-ba50-05ca45bf8abc';
export const PMScan_DISPLAY_UUID = 'f364190a-00b0-4240-ba50-05ca45bf8abc';

// Date constant for PMScan timestamp conversion
export const DT_2000 = 946684800;

// BLE operation timeouts (ms)
export const BLE_TIMEOUTS = {
  CONNECT: 10000,
  READ: 5000,
  WRITE: 5000,
  START_NOTIFICATIONS: 8000,
  OPERATION_DEFAULT: 5000,
} as const;
