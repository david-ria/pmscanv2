-- Add geohash privacy columns to group_settings
ALTER TABLE public.group_settings
ADD COLUMN geohash_privacy_enabled BOOLEAN DEFAULT false,
ADD COLUMN geohash_precision INTEGER DEFAULT 6;

COMMENT ON COLUMN public.group_settings.geohash_privacy_enabled IS 'When enabled, shared missions from members show only geohash to OTHER members (not the recorder)';
COMMENT ON COLUMN public.group_settings.geohash_precision IS 'Precision level for geohash aggregation in group views (4=city, 5=district, 6=neighborhood, 7=block, 8=building, 9+=precise)';

-- Create a view that respects group privacy settings
CREATE OR REPLACE VIEW public.measurements_group_view AS
SELECT 
  m.id,
  m.mission_id,
  m.timestamp,
  m.pm1,
  m.pm25,
  m.pm10,
  m.temperature,
  m.humidity,
  m.particles_02_05,
  m.particles_05_10,
  m.particles_10_25,
  m.particles_25_50,
  m.particles_50_100,
  m.external_temperature,
  m.external_humidity,
  -- Privacy-aware GPS: NULL if viewing another user's data in privacy-enabled group
  CASE 
    WHEN ms.user_id = auth.uid() THEN m.latitude  -- User sees their own data
    WHEN gs.geohash_privacy_enabled = true THEN NULL  -- Others see NULL in privacy mode
    ELSE m.latitude  -- No privacy mode, show GPS
  END as latitude,
  CASE 
    WHEN ms.user_id = auth.uid() THEN m.longitude
    WHEN gs.geohash_privacy_enabled = true THEN NULL
    ELSE m.longitude
  END as longitude,
  CASE 
    WHEN ms.user_id = auth.uid() THEN m.accuracy
    WHEN gs.geohash_privacy_enabled = true THEN NULL
    ELSE m.accuracy
  END as accuracy,
  m.geohash,  -- Always visible for group aggregation
  m.enriched_location,
  m.automatic_context,
  m.location_context,
  m.activity_context,
  m.timestamp_epoch_ms,
  m.date_utc,
  m.created_at,
  -- Metadata for UI
  (ms.user_id = auth.uid()) as is_own_data,
  gs.geohash_privacy_enabled as group_privacy_active,
  gs.geohash_precision as group_geohash_precision
FROM public.measurements m
INNER JOIN public.missions ms ON m.mission_id = ms.id
LEFT JOIN public.group_settings gs ON ms.group_id = gs.group_id
WHERE 
  -- User can access their own missions
  ms.user_id = auth.uid()
  OR 
  -- Or shared missions in their groups
  (ms.shared = true AND ms.group_id IN (
    SELECT group_id FROM public.group_memberships WHERE user_id = auth.uid()
  ));

-- Grant access to the view
GRANT SELECT ON public.measurements_group_view TO authenticated;