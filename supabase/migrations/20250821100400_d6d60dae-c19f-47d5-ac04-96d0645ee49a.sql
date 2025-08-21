-- Add device_name column to missions table for storing PMScan device names
ALTER TABLE public.missions 
ADD COLUMN device_name TEXT;