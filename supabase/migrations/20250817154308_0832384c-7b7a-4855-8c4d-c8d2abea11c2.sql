-- Create location enrichment data table for caching Nominatim results
CREATE TABLE IF NOT EXISTS public.location_enrichment_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_name TEXT,
  place_class TEXT,
  place_type TEXT,
  amenity TEXT,
  address_components JSONB,
  raw_nominatim_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.location_enrichment_data ENABLE ROW LEVEL SECURITY;

-- Create policies for location enrichment data (allow all authenticated users to read and write)
CREATE POLICY "Location enrichment data is readable by authenticated users" 
ON public.location_enrichment_data 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Location enrichment data is writable by authenticated users" 
ON public.location_enrichment_data 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_enrichment_coords ON public.location_enrichment_data (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_enrichment_timestamp ON public.location_enrichment_data (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_enrichment_spatial ON public.location_enrichment_data (latitude, longitude, timestamp DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_location_enrichment_updated_at
  BEFORE UPDATE ON public.location_enrichment_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();