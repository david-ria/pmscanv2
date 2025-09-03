-- Add missing columns to group_settings table to fix group creation
ALTER TABLE public.group_settings 
ADD COLUMN auto_share_stats boolean DEFAULT false,
ADD COLUMN notification_frequency text DEFAULT 'daily',
ADD COLUMN location_auto_detect boolean DEFAULT false,
ADD COLUMN activity_auto_suggest boolean DEFAULT false,
ADD COLUMN event_notifications boolean DEFAULT false,
ADD COLUMN weekly_reports boolean DEFAULT false;

-- Add constraint for notification_frequency to ensure valid values
ALTER TABLE public.group_settings 
ADD CONSTRAINT group_settings_notification_frequency_check 
CHECK (notification_frequency IN ('immediate', 'hourly', 'daily'));