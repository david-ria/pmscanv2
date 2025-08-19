-- Remove unused Group Settings fields that don't map to real functionality
ALTER TABLE group_settings 
DROP COLUMN IF EXISTS location_auto_detect,
DROP COLUMN IF EXISTS activity_auto_suggest,
DROP COLUMN IF EXISTS notification_frequency,
DROP COLUMN IF EXISTS auto_share_stats,
DROP COLUMN IF EXISTS event_notifications,
DROP COLUMN IF EXISTS weekly_reports;