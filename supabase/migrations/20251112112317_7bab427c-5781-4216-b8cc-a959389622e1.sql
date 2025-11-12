-- Phase 4 Part 2: Air Quality Data Write Protection
-- Ensure only service_role (edge functions) can write air quality data

-- Drop any existing policies (defensive cleanup)
DROP POLICY IF EXISTS "System can create air quality data" ON public.air_quality_data;
DROP POLICY IF EXISTS "System can update air quality data" ON public.air_quality_data;
DROP POLICY IF EXISTS "Prevent unauthorized air quality data writes" ON public.air_quality_data;

-- Allow edge functions (service role) to insert air quality data
CREATE POLICY "System can create air quality data"
ON public.air_quality_data
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow edge functions (service role) to update air quality data
CREATE POLICY "System can update air quality data"
ON public.air_quality_data
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly deny INSERT/UPDATE/DELETE for authenticated and anon users
-- (RLS default is deny, but explicit policies make intent clear)
CREATE POLICY "Prevent unauthorized air quality data writes"
ON public.air_quality_data
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Add table comment for documentation
COMMENT ON TABLE public.air_quality_data IS 
'Air quality reference data from external sources (AtmoSud, OpenWeather, etc.).
Write access restricted to edge functions (service_role) only.
Public can read to compare personal measurements with reference data.
RLS policies ensure data integrity and prevent unauthorized modifications.';