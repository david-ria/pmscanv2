import { z } from 'zod';

// Enhanced config schema with new metrics section
export const ConfigSchema = z.object({
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string(),
  }),
  storage: z.object({
    bucket: z.string(),
    pathPrefix: z.string().default('exports/'),
  }),
  api: z.object({
    url: z.string().url(),
    key: z.string(),
  }),
  rateLimiting: z.object({
    maxRequestsPerSecond: z.number().default(10),
    maxConcurrentRequests: z.number().default(5),
  }),
  polling: z.object({
    intervalMs: z.number().default(60000),
    batchSize: z.number().default(100),
  }),
  retry: z.object({
    maxRetries: z.number().default(3),
    delayMs: z.number().default(1000),
    backoffMultiplier: z.number().default(2),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
  health: z.object({
    port: z.number().default(3000),
  }),
  database: z.object({
    path: z.string().default('./data/robot-state.db'),
  }),
  sensorMap: z.object({
    path: z.string().default('./data/sensor_map.csv'),
  }),
  metrics: z.object({
    include: z.array(z.string()),
    units: z.record(z.string()),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// CSV row structure from mission exports
export const CSVRowSchema = z.object({
  Timestamp: z.string(),
  PM1: z.string(),
  'PM2.5': z.string(),
  PM10: z.string(),
  Location: z.string().optional(),
  Activity: z.string().optional(),
});

export type CSVRow = z.infer<typeof CSVRowSchema>;

// API payload structure
export const APIPayloadSchema = z.object({
  idSensor: z.number(),
  time: z.string(),
  data: z.object({
    pm25: z.object({
      value: z.number(),
      unit: z.literal('ugm3'),
    }),
  }),
});

export type APIPayload = z.infer<typeof APIPayloadSchema>;

// Sensor mapping
export const SensorMappingSchema = z.object({
  device_id: z.string(),
  idSensor: z.number(),
});

export type SensorMapping = z.infer<typeof SensorMappingSchema>;

// File fingerprint for idempotency tracking
export interface FileFingerprint {
  path: string;
  size: number;
  lastModified: string;
  fingerprint: string; // Combined fingerprint string
}

// Storage file metadata from Supabase
export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
    cacheControl: string;
  };
  basename?: string; // Just the filename without prefix
  fullPath?: string; // Full path including prefix
}

// Database entities with fingerprinting and status support
export interface ProcessedFile {
  id: number;
  path: string; // Full file path
  fingerprint: string; // Unique fingerprint for re-upload detection
  device_id: string;
  status: 'processing' | 'done' | 'failed'; // Processing status
  processed_at: string;
  started_at: string;
  finished_at: string | null;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  last_row_timestamp: string | null;
  file_size: number;
  error_message: string | null;
}

export interface ProcessedRow {
  id: number;
  file_id: number;
  row_index: number;
  timestamp: string;
  sent_at: string;
  response_status: number | null;
}

export interface DeadLetterEntry {
  id: number;
  file_id: number;
  row_index: number;
  payload: string; // JSON string
  error_message: string;
  attempt_count: number;
  created_at: string;
  last_attempt_at: string;
}

// Processing state
export interface ProcessingState {
  filesProcessed: number;
  rowsProcessed: number;
  rowsSent: number;
  rowsFailed: number;
  deadLetterCount: number;
  lastPollAt: string | null;
  lastProcessedFile: string | null;
}

// Health check response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  database: {
    connected: boolean;
  };
  supabase: {
    connected: boolean;
  };
  processing: ProcessingState;
}

// Metrics response
export interface MetricsResponse extends ProcessingState {
  rateLimiting: {
    currentRPS: number;
    averageRPS: number;
    queueSize: number;
  };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';