-- Create table for mission recordings
CREATE TABLE public.missions (
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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual measurements
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  pm1 REAL NOT NULL,
  pm25 REAL NOT NULL,
  pm10 REAL NOT NULL,
  temperature REAL,
  humidity REAL,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Create policies for missions (allow access without authentication for now)
CREATE POLICY "Anyone can view missions" 
ON public.missions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create missions" 
ON public.missions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update missions" 
ON public.missions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete missions" 
ON public.missions 
FOR DELETE 
USING (true);

-- Create policies for measurements
CREATE POLICY "Anyone can view measurements" 
ON public.measurements 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create measurements" 
ON public.measurements 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update measurements" 
ON public.measurements 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete measurements" 
ON public.measurements 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_missions_user_id ON public.missions(user_id);
CREATE INDEX idx_missions_created_at ON public.missions(created_at DESC);
CREATE INDEX idx_measurements_mission_id ON public.measurements(mission_id);
CREATE INDEX idx_measurements_timestamp ON public.measurements(timestamp DESC);