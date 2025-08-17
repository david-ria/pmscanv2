-- Create location enrichment data table for caching Nominatim reverse geocoding results
CREATE TABLE public.location_enrichment_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_name TEXT,
  place_type TEXT,
  place_class TEXT,
  amenity TEXT,
  address_components JSONB,
  raw_nominatim_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_enrichment_data ENABLE ROW LEVEL SECURITY;

-- Anyone can read location enrichment data (public service)
CREATE POLICY "Location enrichment data is publicly readable" 
ON public.location_enrichment_data 
FOR SELECT 
USING (true);

-- System can create and update location enrichment data
CREATE POLICY "System can create location enrichment data" 
ON public.location_enrichment_data 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update location enrichment data" 
ON public.location_enrichment_data 
FOR UPDATE 
USING (true);

-- Create index for efficient location-based queries
CREATE INDEX idx_location_enrichment_data_coords ON public.location_enrichment_data (latitude, longitude);
CREATE INDEX idx_location_enrichment_data_timestamp ON public.location_enrichment_data (timestamp);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_location_enrichment_data_updated_at
BEFORE UPDATE ON public.location_enrichment_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();