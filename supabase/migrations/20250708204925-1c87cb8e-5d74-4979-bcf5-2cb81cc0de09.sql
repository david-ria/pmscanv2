-- Create table to store user fitness data
CREATE TABLE public.fitness_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  steps INTEGER,
  distance_meters REAL,
  calories REAL,
  source TEXT DEFAULT 'google_fit',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fitness_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own fitness activities" 
ON public.fitness_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fitness activities" 
ON public.fitness_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness activities" 
ON public.fitness_activities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness activities" 
ON public.fitness_activities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fitness_activities_updated_at
BEFORE UPDATE ON public.fitness_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();