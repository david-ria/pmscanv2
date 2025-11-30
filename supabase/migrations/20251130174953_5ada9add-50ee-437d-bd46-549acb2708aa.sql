-- Drop existing function to recreate with new column
DROP FUNCTION IF EXISTS get_group_geohash_aggregates(UUID, DATE, DATE, INTEGER);

-- Recreate function with last_measurement_time
CREATE OR REPLACE FUNCTION get_group_geohash_aggregates(
  p_group_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_geohash_precision INTEGER DEFAULT 6
)
RETURNS TABLE (
  geohash_cell TEXT,
  avg_pm25 REAL,
  avg_pm10 REAL,
  avg_pm1 REAL,
  measurement_count INTEGER,
  contributor_count INTEGER,
  last_measurement_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    LEFT(m.geohash, p_geohash_precision) as geohash_cell,
    AVG(m.pm25)::REAL as avg_pm25,
    AVG(m.pm10)::REAL as avg_pm10,
    AVG(m.pm1)::REAL as avg_pm1,
    COUNT(*)::INTEGER as measurement_count,
    COUNT(DISTINCT ms.user_id)::INTEGER as contributor_count,
    MAX(m.timestamp)::TIMESTAMPTZ as last_measurement_time
  FROM public.measurements m
  INNER JOIN public.missions ms ON m.mission_id = ms.id
  WHERE ms.group_id = p_group_id
    AND ms.shared = true
    AND m.geohash IS NOT NULL
    AND DATE(m.timestamp) BETWEEN p_start_date AND p_end_date
  GROUP BY LEFT(m.geohash, p_geohash_precision)
  HAVING COUNT(*) >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;