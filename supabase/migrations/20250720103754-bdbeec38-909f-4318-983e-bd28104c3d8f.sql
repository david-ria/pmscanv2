-- Add location_context and activity_context columns to measurements table
ALTER TABLE public.measurements 
ADD COLUMN location_context text,
ADD COLUMN activity_context text;