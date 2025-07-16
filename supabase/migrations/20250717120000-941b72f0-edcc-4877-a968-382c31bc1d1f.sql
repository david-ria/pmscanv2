-- Create AirBeam missions table mirroring missions structure
CREATE TABLE public.airbeam_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  avg_pm1 REAL NOT NULL,
  avg_pm25 REAL NOT NULL,
  avg_pm10 REAL NOT NULL,
  max_pm25 REAL NOT NULL,
  measurements_count INTEGER NOT NULL DEFAULT 0,
  location_context TEXT,
  activity_context TEXT,
  recording_frequency TEXT,
  shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  weather_data_id UUID REFERENCES public.weather_data(id),
  air_quality_data_id UUID NULL,
  CONSTRAINT fk_airbeam_missions_air_quality_data FOREIGN KEY (air_quality_data_id)
    REFERENCES public.air_quality_data(id)
);

-- Create AirBeam measurements table referencing airbeam_missions
CREATE TABLE public.airbeam_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  airbeam_mission_id UUID NOT NULL REFERENCES public.airbeam_missions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  pm1 REAL NOT NULL,
  pm25 REAL NOT NULL,
  pm10 REAL NOT NULL,
  temperature REAL,
  humidity REAL,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  automatic_context TEXT
);

-- Enable Row Level Security
ALTER TABLE public.airbeam_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airbeam_measurements ENABLE ROW LEVEL SECURITY;

-- Policies mirroring missions and measurements
CREATE POLICY "Anyone can view airbeam_missions"
ON public.airbeam_missions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create airbeam_missions"
ON public.airbeam_missions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update airbeam_missions"
ON public.airbeam_missions
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete airbeam_missions"
ON public.airbeam_missions
FOR DELETE
USING (true);

CREATE POLICY "Anyone can view airbeam_measurements"
ON public.airbeam_measurements
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create airbeam_measurements"
ON public.airbeam_measurements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update airbeam_measurements"
ON public.airbeam_measurements
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete airbeam_measurements"
ON public.airbeam_measurements
FOR DELETE
USING (true);

-- Trigger for automatic updated_at updates
CREATE TRIGGER update_airbeam_missions_updated_at
BEFORE UPDATE ON public.airbeam_missions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes mirroring missions and measurements
CREATE INDEX idx_airbeam_missions_user_id ON public.airbeam_missions(user_id);
CREATE INDEX idx_airbeam_missions_created_at ON public.airbeam_missions(created_at DESC);
CREATE INDEX idx_airbeam_missions_user_name ON public.airbeam_missions(user_id, name);
CREATE INDEX idx_airbeam_measurements_mission_id ON public.airbeam_measurements(airbeam_mission_id);
CREATE INDEX idx_airbeam_measurements_timestamp ON public.airbeam_measurements(timestamp DESC);

-- Unique constraints similar to missions
ALTER TABLE public.airbeam_missions
  ADD CONSTRAINT unique_airbeam_mission_name_per_user
  UNIQUE (user_id, name)
  DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX unique_airbeam_system_mission_name
ON public.airbeam_missions(name)
WHERE user_id IS NULL;
