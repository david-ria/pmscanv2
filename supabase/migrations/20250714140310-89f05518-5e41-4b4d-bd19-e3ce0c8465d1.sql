-- Add WiFi SSID columns to profiles table for auto-context learning
ALTER TABLE public.profiles 
ADD COLUMN home_wifi_ssid TEXT,
ADD COLUMN work_wifi_ssid TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.profiles.home_wifi_ssid IS 'Learned WiFi SSID for home location detection';
COMMENT ON COLUMN public.profiles.work_wifi_ssid IS 'Learned WiFi SSID for work location detection';