-- Add performance indexes for mission history
-- Speed up mission list queries by user and creation time
CREATE INDEX IF NOT EXISTS idx_missions_user_created 
ON public.missions(user_id, created_at DESC);

-- Speed up enrichment checks (finding missions without weather data)
CREATE INDEX IF NOT EXISTS idx_missions_weather_lookup 
ON public.missions(user_id, weather_data_id) 
WHERE weather_data_id IS NULL;

-- Speed up measurement lookups by mission and time
CREATE INDEX IF NOT EXISTS idx_measurements_mission_time 
ON public.measurements(mission_id, timestamp);

-- Speed up geohash queries for collaborative maps
CREATE INDEX IF NOT EXISTS idx_measurements_geohash 
ON public.measurements(geohash) 
WHERE geohash IS NOT NULL;