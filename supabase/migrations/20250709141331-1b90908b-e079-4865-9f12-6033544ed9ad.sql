-- Create user_locations table for custom locations
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude REAL,
  longitude REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_activities table for custom activities
CREATE TABLE public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_alarms table for custom alarms
CREATE TABLE public.user_alarms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  pm1_threshold REAL,
  pm25_threshold REAL,
  pm10_threshold REAL,
  notification_frequency TEXT DEFAULT 'immediate',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_events table for custom events
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'custom',
  start_date DATE,
  end_date DATE,
  recurrence TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_locations
CREATE POLICY "Users can view their own locations" 
ON public.user_locations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own locations" 
ON public.user_locations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations" 
ON public.user_locations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations" 
ON public.user_locations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_activities
CREATE POLICY "Users can view their own activities" 
ON public.user_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities" 
ON public.user_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" 
ON public.user_activities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" 
ON public.user_activities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_alarms
CREATE POLICY "Users can view their own alarms" 
ON public.user_alarms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alarms" 
ON public.user_alarms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alarms" 
ON public.user_alarms 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alarms" 
ON public.user_alarms 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_events
CREATE POLICY "Users can view their own events" 
ON public.user_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.user_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
ON public.user_events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
ON public.user_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_locations_updated_at
BEFORE UPDATE ON public.user_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_activities_updated_at
BEFORE UPDATE ON public.user_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_alarms_updated_at
BEFORE UPDATE ON public.user_alarms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_events_updated_at
BEFORE UPDATE ON public.user_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();