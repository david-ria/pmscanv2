-- Revert weather_data and air_quality_data to public access
-- These contain environmental data that should be publicly readable

-- Restore public access to weather_data
DROP POLICY IF EXISTS "Authenticated users can view weather data" ON public.weather_data;
CREATE POLICY "Anyone can view weather data" 
ON public.weather_data 
FOR SELECT 
USING (true);

-- Restore public access to air_quality_data
DROP POLICY IF EXISTS "Authenticated users can view air quality data" ON public.air_quality_data;
CREATE POLICY "Air quality data is publicly readable"
ON public.air_quality_data
FOR SELECT
USING (true);

-- Keep the function security fixes (search_path protections) - they are beneficial