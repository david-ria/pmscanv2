-- Add enriched_location column to measurements table
ALTER TABLE public.measurements 
ADD COLUMN enriched_location TEXT;