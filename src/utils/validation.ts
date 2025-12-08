import { z } from 'zod';

/**
 * Comprehensive runtime type validation schemas
 * Ensures data integrity throughout the application
 */

// Base schemas
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format');
export const TimestampSchema = z.coerce.date();
export const PositiveNumberSchema = z.number().positive('Must be a positive number');
export const NonEmptyStringSchema = z.string().min(1, 'Cannot be empty');

// Location schemas
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
});

export const LocationSchema = z.object({
  id: UUIDSchema,
  name: NonEmptyStringSchema.max(100),
  description: z.string().max(500).optional(),
  coordinates: CoordinatesSchema.optional(),
  user_id: UUIDSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

// PM data schemas
export const PMDataSchema = z.object({
  pm1: PositiveNumberSchema,
  pm25: PositiveNumberSchema,
  pm10: PositiveNumberSchema,
  // Extended sensor fields
  co2: z.number().optional(),
  voc: z.number().optional(),
});

export const MeasurementSchema = z.object({
  id: UUIDSchema,
  mission_id: UUIDSchema,
  timestamp: TimestampSchema,
  pm1: PositiveNumberSchema,
  pm25: PositiveNumberSchema,
  pm10: PositiveNumberSchema,
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  // Extended sensor fields
  co2: z.number().optional(),
  voc: z.number().optional(),
  // Location fields
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
  automatic_context: z.string().optional(),
  created_at: TimestampSchema,
});

// Mission schemas
export const MissionSchema = z.object({
  id: UUIDSchema,
  name: NonEmptyStringSchema.max(100),
  user_id: UUIDSchema.optional(),
  start_time: TimestampSchema,
  end_time: TimestampSchema,
  duration_minutes: z.number().int().positive(),
  avg_pm1: PositiveNumberSchema,
  avg_pm25: PositiveNumberSchema,
  avg_pm10: PositiveNumberSchema,
  max_pm25: PositiveNumberSchema,
  measurements_count: z.number().int().min(0),
  location_context: z.string().max(100).optional(),
  activity_context: z.string().max(100).optional(),
  recording_frequency: z.string().optional(),
  shared: z.boolean().default(false),
  weather_data_id: UUIDSchema.optional(),
  air_quality_data_id: UUIDSchema.optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

// Group schemas
export const GroupMembershipSchema = z.object({
  id: UUIDSchema,
  group_id: UUIDSchema,
  user_id: UUIDSchema,
  role: z.enum(['admin', 'member']),
  joined_at: TimestampSchema,
});

export const GroupSchema = z.object({
  id: UUIDSchema,
  name: NonEmptyStringSchema.max(100),
  description: z.string().max(500).optional(),
  created_by: UUIDSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const GroupInvitationSchema = z.object({
  id: UUIDSchema,
  group_id: UUIDSchema,
  inviter_id: UUIDSchema,
  invitee_id: UUIDSchema.optional(),
  invitee_email: EmailSchema,
  token: NonEmptyStringSchema,
  status: z.enum(['pending', 'accepted', 'declined', 'expired']),
  expires_at: TimestampSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

// Threshold schemas
export const ThresholdConfigSchema = z.object({
  pm1_min: z.number().optional(),
  pm1_max: z.number().optional(),
  pm25_min: z.number().optional(),
  pm25_max: z.number().optional(),
  pm10_min: z.number().optional(),
  pm10_max: z.number().optional(),
}).refine(
  (data) => {
    // Validate that min < max for each PM type
    const checks = ['pm1', 'pm25', 'pm10'] as const;
    return checks.every(pm => {
      const min = data[`${pm}_min` as keyof typeof data];
      const max = data[`${pm}_max` as keyof typeof data];
      return !min || !max || min < max;
    });
  },
  { message: 'Minimum threshold must be less than maximum threshold' }
);

export const CustomThresholdSchema = z.object({
  id: UUIDSchema,
  name: NonEmptyStringSchema.max(100),
  group_id: UUIDSchema.optional(),
  enabled: z.boolean().default(true),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  pm1_min: z.number().optional(),
  pm1_max: z.number().optional(),
  pm25_min: z.number().optional(),
  pm25_max: z.number().optional(),
  pm10_min: z.number().optional(),
  pm10_max: z.number().optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

// User activity schemas
export const UserActivitySchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  name: NonEmptyStringSchema.max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

// Weather data schemas
export const WeatherDataSchema = z.object({
  id: UUIDSchema,
  latitude: z.number(),
  longitude: z.number(),
  timestamp: TimestampSchema,
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  pressure: z.number().positive(),
  weather_main: NonEmptyStringSchema,
  weather_description: NonEmptyStringSchema,
  wind_speed: z.number().min(0).optional(),
  wind_direction: z.number().min(0).max(360).optional(),
  visibility: z.number().positive().optional(),
  uv_index: z.number().min(0).optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

// API response schemas
export const APIErrorSchema = z.object({
  message: NonEmptyStringSchema,
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    count: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().min(1),
  });

// Export types
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type PMData = z.infer<typeof PMDataSchema>;
export type Measurement = z.infer<typeof MeasurementSchema>;
export type Mission = z.infer<typeof MissionSchema>;
export type GroupMembership = z.infer<typeof GroupMembershipSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type GroupInvitation = z.infer<typeof GroupInvitationSchema>;
export type ThresholdConfig = z.infer<typeof ThresholdConfigSchema>;
export type CustomThreshold = z.infer<typeof CustomThresholdSchema>;
export type UserActivity = z.infer<typeof UserActivitySchema>;
export type WeatherData = z.infer<typeof WeatherDataSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;

// Validation helper functions
export const validateAndTransform = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const contextStr = context ? ` in ${context}` : '';
      throw new Error(
        `Validation failed${contextStr}: ${error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ')}`
      );
    }
    throw error;
  }
};

export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Unknown validation error' };
  }
};