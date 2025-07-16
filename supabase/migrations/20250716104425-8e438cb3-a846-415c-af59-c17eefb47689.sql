-- Create weather_data table to cache weather information
CREATE TABLE public.weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature REAL NOT NULL,
  humidity REAL NOT NULL,
  pressure REAL NOT NULL,
  weather_main TEXT NOT NULL, -- e.g., "Rain", "Clear", "Clouds"
  weather_description TEXT NOT NULL, -- e.g., "light rain", "clear sky"
  wind_speed REAL,
  wind_direction REAL,
  visibility REAL,
  uv_index REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add weather_data_id reference to measurements table
ALTER TABLE public.measurements 
ADD COLUMN weather_data_id UUID REFERENCES public.weather_data(id);

-- Enable RLS on weather_data table
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

-- Create policies for weather_data (public read access since weather is public information)
CREATE POLICY "Anyone can view weather data" 
ON public.weather_data 
FOR SELECT 
USING (true);

CREATE POLICY "System can create weather data" 
ON public.weather_data 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update weather data" 
ON public.weather_data 
FOR UPDATE 
USING (true);

-- Create indexes for efficient weather data lookups
CREATE INDEX idx_weather_data_location_time ON public.weather_data(latitude, longitude, timestamp);
CREATE INDEX idx_weather_data_timestamp ON public.weather_data(timestamp);

-- Create function to update updated_at column
CREATE TRIGGER update_weather_data_updated_at
BEFORE UPDATE ON public.weather_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();