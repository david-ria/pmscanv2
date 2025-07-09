-- Create group_custom_thresholds table for group-specific custom thresholds
CREATE TABLE public.group_custom_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  name TEXT NOT NULL,
  pm1_min REAL,
  pm1_max REAL,
  pm25_min REAL,
  pm25_max REAL,
  pm10_min REAL,
  pm10_max REAL,
  color TEXT DEFAULT '#3b82f6',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.group_custom_thresholds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for group_custom_thresholds
CREATE POLICY "Group members can view group custom thresholds" 
ON public.group_custom_thresholds 
FOR SELECT 
USING (group_id IN (
  SELECT group_id
  FROM public.group_memberships
  WHERE user_id = auth.uid()
));

CREATE POLICY "Group admins can manage group custom thresholds" 
ON public.group_custom_thresholds 
FOR ALL
USING (group_id IN (
  SELECT group_id
  FROM public.group_memberships
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for updated_at column
CREATE TRIGGER update_group_custom_thresholds_updated_at
BEFORE UPDATE ON public.group_custom_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();