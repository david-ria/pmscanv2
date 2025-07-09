-- Add new columns to group_settings table for location, activity, and events
ALTER TABLE public.group_settings 
ADD COLUMN IF NOT EXISTS default_location TEXT,
ADD COLUMN IF NOT EXISTS location_auto_detect BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_activity TEXT,
ADD COLUMN IF NOT EXISTS activity_auto_suggest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS event_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_reports BOOLEAN DEFAULT false;