-- Add automatic_context field to measurements table
ALTER TABLE public.measurements 
ADD COLUMN automatic_context TEXT;