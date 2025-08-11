-- Add epoch millisecond columns to missions table
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS start_epoch_ms bigint,
  ADD COLUMN IF NOT EXISTS end_epoch_ms bigint;

-- Backfill from existing timestamptz columns
UPDATE missions
SET start_epoch_ms = EXTRACT(EPOCH FROM start_time) * 1000
WHERE start_epoch_ms IS NULL AND start_time IS NOT NULL;

UPDATE missions
SET end_epoch_ms = EXTRACT(EPOCH FROM end_time) * 1000
WHERE end_epoch_ms IS NULL AND end_time IS NOT NULL;

-- Add epoch millisecond column to measurements table
ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS timestamp_epoch_ms bigint;

-- Backfill from existing timestamptz column
UPDATE measurements
SET timestamp_epoch_ms = EXTRACT(EPOCH FROM timestamp) * 1000
WHERE timestamp_epoch_ms IS NULL AND timestamp IS NOT NULL;

-- Add generated date column for fast day-level queries on measurements
ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS date_utc date
  GENERATED ALWAYS AS ((to_timestamp(timestamp_epoch_ms/1000) AT TIME ZONE 'UTC')::date) STORED;

-- Add epoch millisecond column to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS timestamp_epoch_ms bigint;

-- Backfill events from existing timestamptz column
UPDATE events
SET timestamp_epoch_ms = EXTRACT(EPOCH FROM timestamp) * 1000
WHERE timestamp_epoch_ms IS NULL AND timestamp IS NOT NULL;

-- Add generated date column for events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS date_utc date
  GENERATED ALWAYS AS ((to_timestamp(timestamp_epoch_ms/1000) AT TIME ZONE 'UTC')::date) STORED;

-- Add epoch millisecond columns to fitness_activities table
ALTER TABLE fitness_activities
  ADD COLUMN IF NOT EXISTS start_epoch_ms bigint,
  ADD COLUMN IF NOT EXISTS end_epoch_ms bigint;

-- Backfill fitness_activities
UPDATE fitness_activities
SET start_epoch_ms = EXTRACT(EPOCH FROM start_time) * 1000
WHERE start_epoch_ms IS NULL AND start_time IS NOT NULL;

UPDATE fitness_activities
SET end_epoch_ms = EXTRACT(EPOCH FROM end_time) * 1000
WHERE end_epoch_ms IS NULL AND end_time IS NOT NULL;

-- Add epoch millisecond column to weather_data table
ALTER TABLE weather_data
  ADD COLUMN IF NOT EXISTS timestamp_epoch_ms bigint;

-- Backfill weather_data
UPDATE weather_data
SET timestamp_epoch_ms = EXTRACT(EPOCH FROM timestamp) * 1000
WHERE timestamp_epoch_ms IS NULL AND timestamp IS NOT NULL;

-- Add epoch millisecond column to air_quality_data table
ALTER TABLE air_quality_data
  ADD COLUMN IF NOT EXISTS timestamp_epoch_ms bigint;

-- Backfill air_quality_data
UPDATE air_quality_data
SET timestamp_epoch_ms = EXTRACT(EPOCH FROM timestamp) * 1000
WHERE timestamp_epoch_ms IS NULL AND timestamp IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_date_utc ON measurements (date_utc);
CREATE INDEX IF NOT EXISTS idx_measurements_timestamp_epoch_ms ON measurements (timestamp_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_events_date_utc ON events (date_utc);
CREATE INDEX IF NOT EXISTS idx_events_timestamp_epoch_ms ON events (timestamp_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_missions_start_epoch_ms ON missions (start_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_missions_end_epoch_ms ON missions (end_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_weather_data_timestamp_epoch_ms ON weather_data (timestamp_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_air_quality_data_timestamp_epoch_ms ON air_quality_data (timestamp_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_fitness_activities_start_epoch_ms ON fitness_activities (start_epoch_ms);
CREATE INDEX IF NOT EXISTS idx_fitness_activities_end_epoch_ms ON fitness_activities (end_epoch_ms);