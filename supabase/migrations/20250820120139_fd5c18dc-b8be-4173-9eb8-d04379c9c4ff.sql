-- Add geohash column to measurements table for spatial indexing
ALTER TABLE public.measurements 
ADD COLUMN geohash text;

-- Add index on geohash column for efficient spatial queries
CREATE INDEX idx_measurements_geohash ON public.measurements(geohash);

-- Add comment explaining the geohash column
COMMENT ON COLUMN public.measurements.geohash IS 'Geohash encoding of the measurement location for spatial indexing and privacy';