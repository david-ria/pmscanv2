-- Add actual recording duration and coverage fields to missions table
ALTER TABLE public.missions 
ADD COLUMN actual_recording_minutes integer DEFAULT NULL,
ADD COLUMN recording_coverage_percentage real DEFAULT NULL,
ADD COLUMN gap_detected boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.missions.actual_recording_minutes IS 'Actual recording time based on measurement intervals, excluding gaps';
COMMENT ON COLUMN public.missions.recording_coverage_percentage IS 'Percentage of intended recording time that was actually captured';
COMMENT ON COLUMN public.missions.gap_detected IS 'Flag indicating if significant recording gaps were detected';