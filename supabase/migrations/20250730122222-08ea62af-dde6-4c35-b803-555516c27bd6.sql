-- Fix missions with 0 duration by recalculating based on start/end times or estimating from measurement count
UPDATE missions 
SET duration_minutes = CASE 
  -- If time difference gives us a reasonable duration (>= 1 minute), use it
  WHEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 >= 1 
    THEN ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)
  -- If we have measurements but 0 duration, estimate based on measurement count (30 seconds per measurement minimum)
  WHEN measurements_count > 1 AND duration_minutes = 0
    THEN GREATEST(1, ROUND((measurements_count - 1) * 0.5))
  -- Otherwise keep existing duration
  ELSE duration_minutes
END
WHERE duration_minutes = 0 AND measurements_count > 0;