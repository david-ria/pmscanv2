-- Create events table to log events during missions
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  comment TEXT,
  photo_url TEXT,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_events_mission_id FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Users can view events from their missions" 
ON public.events 
FOR SELECT 
USING (mission_id IN (
  SELECT id FROM missions 
  WHERE user_id = auth.uid() OR shared = true
));

CREATE POLICY "Users can create events for their missions" 
ON public.events 
FOR INSERT 
WITH CHECK (mission_id IN (
  SELECT id FROM missions 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update events from their missions" 
ON public.events 
FOR UPDATE 
USING (mission_id IN (
  SELECT id FROM missions 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete events from their missions" 
ON public.events 
FOR DELETE 
USING (mission_id IN (
  SELECT id FROM missions 
  WHERE user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for event photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-photos', 'event-photos', true);

-- Create storage policies for event photos
CREATE POLICY "Event photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-photos');

CREATE POLICY "Users can upload event photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their event photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their event photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-photos' AND auth.uid()::text = (storage.foldername(name))[1]);