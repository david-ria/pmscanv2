-- Add TVOC and Pressure columns, remove CO2/VOC columns
-- TVOC (Total Volatile Organic Compounds) and Pressure are the correct fields for extended sensors

-- Add new columns for extended sensor support
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS tvoc REAL,
ADD COLUMN IF NOT EXISTS pressure REAL;

-- Remove incorrect CO2/VOC columns that were added by mistake
-- Atmotube Pro reports TVOC, not CO2
ALTER TABLE public.measurements 
DROP COLUMN IF EXISTS co2,
DROP COLUMN IF EXISTS voc;

-- Add documentation comments
COMMENT ON COLUMN public.measurements.tvoc IS 'Total Volatile Organic Compounds (TVOC) index or concentration';
COMMENT ON COLUMN public.measurements.pressure IS 'Atmospheric pressure in hPa';