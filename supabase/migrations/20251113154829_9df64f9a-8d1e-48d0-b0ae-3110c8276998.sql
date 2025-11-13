-- Fix group geohash aggregates to respect group_id and shared status
-- This prevents personal historical data from leaking into group maps

DROP FUNCTION IF EXISTS public.get_group_geohash_aggregates(uuid, date, date, integer);

CREATE OR REPLACE FUNCTION public.get_group_geohash_aggregates(
  p_group_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_geohash_precision INT DEFAULT 6
)
RETURNS TABLE (
  geohash_cell TEXT,
  avg_pm25 REAL,
  avg_pm10 REAL,
  avg_pm1 REAL,
  measurement_count INTEGER,
  contributor_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    LEFT(m.geohash, p_geohash_precision) as geohash_cell,
    AVG(m.pm25)::REAL as avg_pm25,
    AVG(m.pm10)::REAL as avg_pm10,
    AVG(m.pm1)::REAL as avg_pm1,
    COUNT(*)::INTEGER as measurement_count,
    COUNT(DISTINCT ms.user_id)::INTEGER as contributor_count
  FROM public.measurements m
  INNER JOIN public.missions ms ON m.mission_id = ms.id
  WHERE ms.group_id = p_group_id              -- Mission must be assigned to THIS group
    AND ms.shared = true                       -- Mission must be explicitly shared
    AND m.geohash IS NOT NULL
    AND DATE(m.timestamp) BETWEEN p_start_date AND p_end_date
  GROUP BY LEFT(m.geohash, p_geohash_precision)
  HAVING COUNT(*) >= 3; -- Privacy: minimum 3 measurements per cell
END;
$$;