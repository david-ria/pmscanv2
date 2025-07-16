-- Create a table for air quality data from Atmosud
CREATE TABLE public.air_quality_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  no2_value REAL NULL,
  o3_value REAL NULL,
  station_name TEXT NULL,
  station_id TEXT NULL,
  data_source TEXT NOT NULL DEFAULT 'atmosud',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.air_quality_data ENABLE ROW LEVEL SECURITY;

-- Create policies for air quality data access (public read, system write)
CREATE POLICY "Air quality data is publicly readable" 
ON public.air_quality_data 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_air_quality_data_updated_at
BEFORE UPDATE ON public.air_quality_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for location-based queries
CREATE INDEX idx_air_quality_data_location_time ON public.air_quality_data(latitude, longitude, timestamp);
CREATE INDEX idx_air_quality_data_timestamp ON public.air_quality_data(timestamp);