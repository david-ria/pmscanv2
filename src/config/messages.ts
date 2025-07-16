/**
 * Professional application-wide constants and error messages
 * Centralized for consistency and maintainability
 */

// Error Messages
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_TIMEOUT: 'Request timed out. Please check your internet connection.',
  NETWORK_OFFLINE: 'You appear to be offline. Please check your connection.',
  NETWORK_GENERIC: 'Network error occurred. Please try again.',
  
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_EMAIL_NOT_VERIFIED: 'Please verify your email before signing in.',
  AUTH_ACCOUNT_LOCKED: 'Account temporarily locked. Please try again later.',
  AUTH_SIGNUP_FAILED: 'Failed to create account. Please try again.',
  AUTH_SIGNOUT_FAILED: 'Failed to sign out. Please try again.',
  AUTH_PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
  
  // Data validation errors
  VALIDATION_REQUIRED_FIELD: 'This field is required.',
  VALIDATION_INVALID_EMAIL: 'Please enter a valid email address.',
  VALIDATION_INVALID_NAME: 'Name must be between 2 and 100 characters.',
  VALIDATION_INVALID_DESCRIPTION: 'Description cannot exceed 500 characters.',
  
  // Permission errors
  PERMISSION_DENIED: 'Permission denied. Please grant the required permissions.',
  PERMISSION_LOCATION_DENIED: 'Location access denied. Please enable location services.',
  PERMISSION_NOTIFICATION_DENIED: 'Notification permission denied.',
  
  // Device errors
  DEVICE_CONNECTION_FAILED: 'Failed to connect to device. Please try again.',
  DEVICE_NOT_FOUND: 'No compatible devices found.',
  DEVICE_DISCONNECTED: 'Device disconnected unexpectedly.',
  
  // Recording errors
  RECORDING_START_FAILED: 'Failed to start recording. Please try again.',
  RECORDING_SAVE_FAILED: 'Failed to save recording. Please try again.',
  RECORDING_EXPORT_FAILED: 'Failed to export data. Please try again.',
  
  // Group errors
  GROUP_CREATE_FAILED: 'Failed to create group. Please try again.',
  GROUP_JOIN_FAILED: 'Failed to join group. Please check the invitation.',
  GROUP_PERMISSION_DENIED: 'You do not have permission to perform this action.',
  GROUP_NOT_FOUND: 'Group not found or no longer exists.',
  
  // Generic errors
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  GENERIC_LOADING_FAILED: 'Failed to load data. Please refresh the page.',
  GENERIC_SAVE_FAILED: 'Failed to save changes. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  AUTH_SIGNIN_SUCCESS: 'Successfully signed in!',
  AUTH_SIGNUP_SUCCESS: 'Account created successfully!',
  AUTH_SIGNOUT_SUCCESS: 'Successfully signed out.',
  AUTH_PASSWORD_UPDATED: 'Password updated successfully.',
  
  DATA_SAVED: 'Changes saved successfully.',
  DATA_DELETED: 'Item deleted successfully.',
  DATA_CREATED: 'Item created successfully.',
  DATA_UPDATED: 'Item updated successfully.',
  DATA_EXPORTED: 'Data exported successfully.',
  
  GROUP_CREATED: 'Group created successfully.',
  GROUP_JOINED: 'Successfully joined group.',
  GROUP_LEFT: 'Successfully left group.',
  GROUP_INVITATION_SENT: 'Invitation sent successfully.',
  
  RECORDING_STARTED: 'Recording started successfully.',
  RECORDING_STOPPED: 'Recording stopped successfully.',
  RECORDING_SAVED: 'Recording saved successfully.',
  
  DEVICE_CONNECTED: 'Device connected successfully.',
  DEVICE_DISCONNECTED: 'Device disconnected successfully.',
} as const;

// Feature Status Messages
export const FEATURE_MESSAGES = {
  EMAIL_NOT_IMPLEMENTED: 'Email functionality is coming soon!',
  OFFLINE_MODE_ACTIVE: 'Offline mode is active. Data will sync when online.',
  BACKGROUND_SYNC_ENABLED: 'Background sync is enabled.',
  BACKGROUND_SYNC_DISABLED: 'Background sync is disabled.',
} as const;

// Warning Messages
export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
  DELETE_CONFIRMATION: 'Are you sure you want to delete this item? This action cannot be undone.',
  CLEAR_DATA_CONFIRMATION: 'This will clear all local data. Are you sure?',
  LEAVE_GROUP_CONFIRMATION: 'Are you sure you want to leave this group?',
  OFFLINE_WARNING: 'Some features may be limited while offline.',
  LOW_BATTERY_WARNING: 'Device battery is low. Recording may be interrupted.',
  STORAGE_FULL_WARNING: 'Local storage is nearly full. Please sync or clear old data.',
} as const;

// Type exports for message categories
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
export type FeatureMessageKey = keyof typeof FEATURE_MESSAGES;
export type WarningMessageKey = keyof typeof WARNING_MESSAGES;