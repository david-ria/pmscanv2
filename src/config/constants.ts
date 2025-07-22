/**
 * Professional constants and configuration management
 * Centralized configuration with type safety and environment support
 */

// Application metadata
export const APP_CONFIG = {
  name: 'PM Air Quality Monitor',
  version: '1.1',
  description: 'Professional air quality monitoring application',
  author: 'Air Quality Team',
} as const;

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds
} as const;

// Air Quality Thresholds (WHO Guidelines)
export const WHO_GUIDELINES = {
  pm25: {
    annual: 5, // μg/m³ annual average
    daily: 15, // μg/m³ 24-hour average
  },
  pm10: {
    annual: 15, // μg/m³ annual average
    daily: 45, // μg/m³ 24-hour average
  },
} as const;

// Air Quality Index (AQI) Breakpoints
export const AQI_BREAKPOINTS = {
  pm25: {
    good: 12,
    moderate: 35.4,
    unhealthyForSensitive: 55.4,
    unhealthy: 150.4,
    veryUnhealthy: 250.4,
    hazardous: 500.4,
  },
  pm10: {
    good: 54,
    moderate: 154,
    unhealthyForSensitive: 254,
    unhealthy: 354,
    veryUnhealthy: 424,
    hazardous: 604,
  },
} as const;

// Default thresholds for quality assessment
export const DEFAULT_THRESHOLDS = {
  pm1: {
    good: 10,
    moderate: 20,
    poor: 35,
  },
  pm25: {
    good: 12,
    moderate: 35,
    poor: 55,
  },
  pm10: {
    good: 50,
    moderate: 100,
    poor: 150,
  },
} as const;

// Recording Configuration
export const RECORDING_CONFIG = {
  frequencies: [
    { value: '1s', label: '1 seconde', interval: 1000 },
    { value: '5s', label: '5 secondes', interval: 5000 },
    { value: '10s', label: '10 secondes', interval: 10000 },
    { value: '30s', label: '30 secondes', interval: 30000 },
    { value: '1m', label: '1 minute', interval: 60000 },
    { value: '5m', label: '5 minutes', interval: 300000 },
  ],
  defaultFrequency: '5s',
  maxDuration: 24 * 60 * 60 * 1000, // 24 hours
  autoSaveInterval: 30000, // 30 seconds
} as const;

// Geolocation Configuration
export const GEOLOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 15000, // 15 seconds
  maximumAge: 300000, // 5 minutes
  desiredAccuracy: 10, // meters
} as const;

// Map Configuration
export const MAP_CONFIG = {
  defaultZoom: 13,
  maxZoom: 18,
  minZoom: 8,
  defaultCenter: {
    latitude: 43.2965, // Marseille
    longitude: 5.3698,
  },
  tileSize: 512,
  attribution: '© Mapbox',
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  defaultDuration: 5000, // 5 seconds
  maxNotifications: 5,
  position: 'bottom-right',
  types: {
    success: {
      duration: 3000,
      icon: '✓',
    },
    error: {
      duration: 8000,
      icon: '✗',
    },
    warning: {
      duration: 5000,
      icon: '⚠',
    },
    info: {
      duration: 4000,
      icon: 'ℹ',
    },
  },
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  allowedTypes: {
    images: ['image/jpeg', 'image/png', 'image/webp'],
    documents: ['application/pdf', 'text/csv', 'application/json'],
  },
  uploadTimeout: 30000, // 30 seconds
} as const;

// Form Validation Configuration
export const VALIDATION_CONFIG = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxEmailLength: 254,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  strongPasswordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Maximum number of cached items
  strategies: {
    weatherData: 15 * 60 * 1000, // 15 minutes
    airQualityData: 10 * 60 * 1000, // 10 minutes
    userProfiles: 30 * 60 * 1000, // 30 minutes
    groupSettings: 60 * 60 * 1000, // 1 hour
  },
} as const;

// Background Task Configuration
export const BACKGROUND_CONFIG = {
  syncInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  backoffFactor: 2,
  maxBackoffDelay: 30 * 1000, // 30 seconds
  wakeLockDuration: 10 * 60 * 1000, // 10 minutes
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  debounceDelay: 300, // milliseconds
  throttleDelay: 100, // milliseconds
  virtualScrollThreshold: 50, // items
  lazyLoadThreshold: 0.1, // 10% intersection
  maxConcurrentRequests: 6,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  enableRealTimeSync: true,
  enableOfflineMode: true,
  enablePushNotifications: true,
  enableBetaFeatures: import.meta.env.DEV,
  enableAnalytics: !import.meta.env.DEV,
  enableErrorReporting: true,
  enablePerformanceMonitoring: true,
} as const;

// Environment-specific configuration
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  baseUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:5173/ws',
} as const;

// Type exports for configuration objects
export type RecordingFrequency = typeof RECORDING_CONFIG.frequencies[number];
export type NotificationType = keyof typeof NOTIFICATION_CONFIG.types;
export type CacheStrategy = keyof typeof CACHE_CONFIG.strategies;
export type AQILevel = keyof typeof AQI_BREAKPOINTS.pm25;

// Utility functions for configuration
export const getRecordingFrequency = (value: string): RecordingFrequency | undefined => {
  return RECORDING_CONFIG.frequencies.find(f => f.value === value);
};

export const getAQILevel = (pm25: number): AQILevel => {
  const breakpoints = AQI_BREAKPOINTS.pm25;
  if (pm25 <= breakpoints.good) return 'good';
  if (pm25 <= breakpoints.moderate) return 'moderate';
  if (pm25 <= breakpoints.unhealthyForSensitive) return 'unhealthyForSensitive';
  if (pm25 <= breakpoints.unhealthy) return 'unhealthy';
  if (pm25 <= breakpoints.veryUnhealthy) return 'veryUnhealthy';
  return 'hazardous';
};

export const getQualityThreshold = (pmType: 'pm1' | 'pm25' | 'pm10', level: 'good' | 'moderate' | 'poor'): number => {
  return DEFAULT_THRESHOLDS[pmType][level];
};