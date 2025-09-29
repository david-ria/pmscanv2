/**
 * Professional type definitions for air quality and environmental data
 * Replaces scattered `any` types with proper interfaces
 */

// PM Scan Data Types
export interface PMScanData {
  pm1: number;
  pm25: number;
  pm10: number;
  timestamp: Date;
  temperature?: number;
  humidity?: number;
}

// Location Data Types
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationWithTimestamp extends LocationData {
  timestamp: Date;
}

// Recording Entry Types
export interface RecordingEntry {
  timestamp: Date;
  pmData: PMScanData;
  location?: LocationData;
  automaticContext?: string;
}

// Analysis Data Types
export interface BreakdownData {
  category: string;
  value: number;
  percentage: number;
  color: string;
  avgPM: number;
}

export interface AnalysisBreakdownData {
  type: 'location' | 'activity' | 'time';
  data: BreakdownData[];
}

// Chart Data Types
export interface ChartDataPoint {
  time: number | string;
  pm1: number;
  pm25: number;
  pm10: number;
  temperature?: number;
  humidity?: number;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  percentage: number;
  avgPM: number;
  color: string;
}

// Threshold Configuration Types
export interface AirQualityThresholds {
  pm1: {
    good: number;
    moderate: number;
    poor: number;
  };
  pm25: {
    good: number;
    moderate: number;
    poor: number;
  };
  pm10: {
    good: number;
    moderate: number;
    poor: number;
  };
}

// Mapbox Types
export interface MapboxLayerConfig {
  id: string;
  type: 'circle' | 'line' | 'fill';
  source: string;
  layout?: Record<string, any>;
  paint?: Record<string, any>;
}

export interface MapboxStyleExpression {
  type: 'case';
  conditions: Array<[any, string]>;
  fallback: string;
}

// Device Connection Types
export interface DeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  batteryLevel?: number;
  signalStrength?: number;
}

// Error Handling Types
export interface AppErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, unknown>;
}

// Utility Function Types
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
export type ErrorHandler = (error: Error, context?: AppErrorContext) => void;
export type SuccessCallback<T = any> = (result: T) => void;
export type ProgressCallback = (progress: number) => void;

// Form Data Types
export interface BaseFormData {
  [key: string]: string | number | boolean | Date | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// API Response Types
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface PaginatedData<T = any> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

// UI Component Prop Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
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

// Context and Provider Types
export interface ContextProviderProps {
  children: React.ReactNode;
}

export interface ContextValue<T = any> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Export utility type guards
export const isPMScanData = (data: any): data is PMScanData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.pm1 === 'number' &&
    typeof data.pm25 === 'number' &&
    typeof data.pm10 === 'number' &&
    data.timestamp instanceof Date
  );
};

export const isLocationData = (data: any): data is LocationData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number'
  );
};

export const isRecordingEntry = (data: any): data is RecordingEntry => {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.timestamp instanceof Date &&
    isPMScanData(data.pmData)
  );
};