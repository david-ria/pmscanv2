-- Create location-activity relationships table
CREATE TABLE public.location_activity_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_key TEXT NOT NULL,
  activity_key TEXT NOT NULL,
  location_label TEXT NOT NULL,
  activity_label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_key, activity_key)
);

-- Enable Row Level Security
ALTER TABLE public.location_activity_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (since this is configuration data)
CREATE POLICY "Location activity mappings are publicly readable" 
ON public.location_activity_mappings 
FOR SELECT 
USING (true);

-- Create policy for system/admin management (only service role can modify)
CREATE POLICY "System can manage location activity mappings" 
ON public.location_activity_mappings 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_location_activity_mappings_updated_at
BEFORE UPDATE ON public.location_activity_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default location-activity mappings
INSERT INTO public.location_activity_mappings (location_key, activity_key, location_label, activity_label) VALUES
-- Home activities
('home', 'work', 'Home', 'Work'),
('home', 'rest', 'Home', 'Rest'),
('home', 'cooking', 'Home', 'Cooking'),
('home', 'sleep', 'Home', 'Sleep'),
('home', 'indoor', 'Home', 'Indoor'),

-- Office activities  
('office', 'work', 'Office', 'Work'),
('office', 'indoor', 'Office', 'Indoor'),
('office', 'rest', 'Office', 'Rest'),

-- School activities
('school', 'indoor', 'School', 'Indoor'), 
('school', 'work', 'School', 'Study'),
('school', 'rest', 'School', 'Rest'),

-- Transport activities
('transport', 'car', 'Transport', 'Car'),
('transport', 'public_transport', 'Transport', 'Public Transport'),
('transport', 'walking', 'Transport', 'Walking'),
('transport', 'cycling', 'Transport', 'Cycling'),
('transport', 'undergroundTransport', 'Transport', 'Underground Transport'),

-- Park activities  
('park', 'outdoor', 'Park', 'Outdoor'),
('park', 'walking', 'Park', 'Walking'),
('park', 'cycling', 'Park', 'Cycling'), 
('park', 'sport', 'Park', 'Sport'),
('park', 'rest', 'Park', 'Rest'),

-- Main street activities
('mainStreet', 'walking', 'Main Street', 'Walking'),
('mainStreet', 'cycling', 'Main Street', 'Cycling'),
('mainStreet', 'outdoor', 'Main Street', 'Outdoor'),
('mainStreet', 'transport', 'Main Street', 'Transport');