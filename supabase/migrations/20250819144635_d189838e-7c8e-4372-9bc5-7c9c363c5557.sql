-- Add member quota to groups table
ALTER TABLE public.groups 
ADD COLUMN member_quota integer DEFAULT NULL;

-- Create group_events table for custom event types
CREATE TABLE public.group_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'circle',
  color text DEFAULT '#3b82f6',
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on group_events
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

-- Create policies for group_events
CREATE POLICY "Group admins can manage group events"
ON public.group_events
FOR ALL
USING (group_id IN (
  SELECT group_memberships.group_id
  FROM group_memberships
  WHERE group_memberships.user_id = auth.uid()
    AND group_memberships.role = 'admin'
));

CREATE POLICY "Group members can view group events"
ON public.group_events
FOR SELECT
USING (group_id IN (
  SELECT group_memberships.group_id
  FROM group_memberships
  WHERE group_memberships.user_id = auth.uid()
));

-- Add alarms configuration to group_settings
ALTER TABLE public.group_settings 
ADD COLUMN custom_alarms jsonb DEFAULT '[]'::jsonb;

-- Add trigger for group_events updated_at
CREATE TRIGGER update_group_events_updated_at
  BEFORE UPDATE ON public.group_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();