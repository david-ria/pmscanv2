# Pull Robot - Database-Direct Architecture

## Overview

The Pull Robot has been refactored to read directly from the Supabase database instead of processing CSV files from storage. This simplifies the architecture and eliminates the need for CSV file intermediates.

## Architecture Changes

### Before (CSV-Based)
1. App saves CSV files to Supabase Storage
2. Robot polls storage for new CSV files
3. Robot downloads and parses CSV files
4. Robot sends data to ATM API

### After (Database-Direct)
1. App syncs mission data directly to Supabase database
2. Robot polls database for unprocessed missions
3. Robot reads measurements directly from database
4. Robot sends data to ATM API
5. Robot marks missions as processed

## Key Components

### Database Poller (`databasePoller.ts`)
- Tests database connection
- Fetches pending missions that need processing
- Filters missions by allowed device IDs
- Tracks processing statistics
- Marks missions as processed/failed

### Database Reader (`databaseReader.ts`)
- Reads mission measurements from database
- Transforms data to ATM API format
- Handles metric filtering and unit conversion
- Processes mission data in batches

### Database Processor (`databaseProcessor.ts`)
- Main processing orchestrator
- Manages polling intervals and batch processing
- Handles individual mission processing
- Sends payloads to ATM API via existing poster
- Provides processor status and statistics

## Database Schema Changes

Added to `missions` table:
- `processed_by_robot` (BOOLEAN) - Whether mission has been processed
- `robot_processed_at` (TIMESTAMP) - When processing completed
- `robot_processing_attempts` (INTEGER) - Number of processing attempts

## Configuration Changes

Simplified configuration removes CSV/storage related settings:
- Removed: `SUPABASE_BUCKET`, `SUPABASE_PREFIX`, `DB_PATH`, `SENSOR_MAP_PATH`
- Removed: `RETRY_DELAY_MS`, `BACKOFF_MULTIPLIER`, `UNKNOWN_MAPPING_BEHAVIOR`
- Kept: All API, polling, processing, and device configuration

## Benefits

1. **Simpler Architecture**: Eliminates CSV file intermediates
2. **Better Performance**: Direct database queries vs file I/O
3. **Improved Reliability**: No file system dependencies
4. **Real-time Processing**: Can process data as soon as it's synced
5. **Easier Monitoring**: Database-based tracking vs file-based

## Migration Notes

- Old CSV-based files moved to `.backup` extensions
- Existing poster and retry logic unchanged
- API endpoints and health checks remain the same
- Configuration format simplified but maintains compatibility

## Usage

The robot continues to work the same way from an operational perspective:
1. Start with `npm run dev` or `npm start`
2. Monitor via `/health` and `/metrics` endpoints
3. Check logs for processing status
4. Configure via environment variables

The key difference is that it now reads from the database instead of CSV files.