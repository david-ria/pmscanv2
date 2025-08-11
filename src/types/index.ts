/**
 * CRITICAL: Universal Type Definitions
 * This file consolidates ALL type definitions to eliminate duplicates and inconsistencies
 */

import { ReactNode } from 'react';

// === CORE DATA TYPES ===
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface PMScanData {
  pm1: number;
  pm25: number;
  pm10: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
  charging?: boolean;
  timestamp: Date;
}

export interface WeatherData {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  timestamp: Date;
}

export interface ContextData {
  location?: string;
  activity?: string;
  automatic?: string;
}

// === RECORDING TYPES ===
export interface RecordingEntry {
  id: string;
  timestamp: Date;
  pmData: PMScanData;
  location?: LocationData;
  weatherData?: WeatherData;
  context?: ContextData;
  automaticContext?: string;
}

export interface MissionData {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  measurements: RecordingEntry[];
  locationContext?: string;
  activityContext?: string;
  shareData?: boolean;
  user_id: string;
}

// === UI COMPONENT PROPS ===
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
}

export interface LoadingProps {
  isLoading: boolean;
  loadingText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface ErrorProps {
  error?: string | null;
  onRetry?: () => void;
  showRetry?: boolean;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

// === CHART & ANALYSIS TYPES ===
export interface ChartDataPoint {
  time: number;
  PM1: number;
  PM25: number;
  PM10: number;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  context?: ContextData;
  location?: LocationData;
}

export interface BreakdownData {
  category: string;
  value: number;
  percentage: number;
  color: string;
  avgPM: number;
  count: number;
}

export type PMType = 'pm1' | 'pm25' | 'pm10';
export type BreakdownType = 'location' | 'activity' | 'autocontext';
export type ContextType = 'location' | 'activity';

// === THRESHOLD TYPES ===
export interface AirQualityThresholds {
  pm1: ThresholdLevels;
  pm25: ThresholdLevels;
  pm10: ThresholdLevels;
}

export interface ThresholdLevels {
  good: number;
  moderate: number;
  poor: number;
  dangerous: number;
}

// === DEVICE TYPES ===
export interface DeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen?: Date;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  services: string[];
}

// === API RESPONSE TYPES ===
export interface APIResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// === FORM TYPES ===
export interface FormState<T = Record<string, unknown>> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// === AUTH TYPES ===
export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile?: UserProfile;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'moderator';

export interface UserProfile {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  alerts: boolean;
  reports: boolean;
}

export interface PrivacySettings {
  shareData: boolean;
  publicProfile: boolean;
  trackLocation: boolean;
}

// === GROUP TYPES ===
export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: GroupMember[];
  settings: GroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: GroupRole;
  joinedAt: Date;
  user?: User;
}

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupSettings {
  isPublic: boolean;
  allowInvites: boolean;
  requireApproval: boolean;
  customThresholds?: AirQualityThresholds;
}

// === EVENT TYPES ===
export interface Event {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  timestamp: Date;
  location?: LocationData;
  missionId?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export type EventType = 
  | 'measurement_start'
  | 'measurement_end'
  | 'threshold_exceeded'
  | 'device_connected'
  | 'device_disconnected'
  | 'location_changed'
  | 'context_changed'
  | 'custom';

// === ASYNC OPERATION TYPES ===
export interface AsyncOperationState<T = unknown> {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: T;
  error?: string;
  progress?: number;
}

// === UTILITY TYPES ===
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// === TYPE GUARDS ===
export const isPMScanData = (data: unknown): data is PMScanData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'pm1' in data &&
    'pm25' in data &&
    'pm10' in data &&
    'timestamp' in data &&
    typeof (data as PMScanData).pm1 === 'number' &&
    typeof (data as PMScanData).pm25 === 'number' &&
    typeof (data as PMScanData).pm10 === 'number' &&
    (data as PMScanData).timestamp instanceof Date
  );
};

export const isLocationData = (data: unknown): data is LocationData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'latitude' in data &&
    'longitude' in data &&
    typeof (data as LocationData).latitude === 'number' &&
    typeof (data as LocationData).longitude === 'number'
  );
};

export const isRecordingEntry = (data: unknown): data is RecordingEntry => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'timestamp' in data &&
    'pmData' in data &&
    typeof (data as RecordingEntry).id === 'string' &&
    (data as RecordingEntry).timestamp instanceof Date &&
    isPMScanData((data as RecordingEntry).pmData)
  );
};

// === ERROR TYPES ===
export interface AppErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  field?: string;
  device?: string;
  operation?: string;
  originalName?: string;
  error?: string;
  function?: string;
  attempt?: number;
  componentStack?: string;
  args?: unknown[];
  key?: string;
  value?: unknown;
  additionalData?: Record<string, unknown>;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLog {
  id: string;
  message: string;
  severity: ErrorSeverity;
  context?: AppErrorContext;
  timestamp: Date;
  resolved: boolean;
}

// === CONFIGURATION TYPES ===
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableAutoSync: boolean;
  };
  thresholds: AirQualityThresholds;
  defaultSettings: UserPreferences;
}

// === ANALYTICS TYPES ===
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsData {
  events: AnalyticsEvent[];
  metrics: Record<string, number>;
  trends: Record<string, number[]>;
}

// Export compatibility types
export * from './app';
export * from './shared';
export * from './recording';
export * from './PMScan';
export * from './serializable';