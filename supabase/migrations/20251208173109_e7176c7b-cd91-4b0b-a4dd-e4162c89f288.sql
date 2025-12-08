-- Add CO2 and VOC columns to measurements table for extended sensor support
ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS co2 real DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voc real DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.measurements.co2 IS 'CO2 concentration in ppm (parts per million)';
COMMENT ON COLUMN public.measurements.voc IS 'VOC index (volatile organic compounds)';