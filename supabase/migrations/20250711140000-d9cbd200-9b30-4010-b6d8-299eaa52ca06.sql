-- Add home_wifi_ssid and work_wifi_ssid columns to profiles
ALTER TABLE public.profiles
ADD COLUMN home_wifi_ssid TEXT,
ADD COLUMN work_wifi_ssid TEXT;
