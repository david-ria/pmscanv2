-- Update the RLS policy for events to allow creation during recording
-- First, drop the existing policy
DROP POLICY IF EXISTS "Users can create events for their missions" ON public.events;

-- Create a new policy that allows users to create events when they have an active recording session
CREATE POLICY "Users can create events during recording" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Update the select policy to also check for user ownership through auth
DROP POLICY IF EXISTS "Users can view events from their missions" ON public.events;

CREATE POLICY "Users can view their own events" 
ON public.events 
FOR SELECT 
USING (
  mission_id IN (
    SELECT id FROM missions 
    WHERE user_id = auth.uid() OR shared = true
  ) OR 
  -- Allow viewing events that don't have a valid mission yet (during recording)
  NOT EXISTS (SELECT 1 FROM missions WHERE id = mission_id)
);

-- Also need to add a temporary field to track which user created the event
ALTER TABLE public.events ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update the insert policy to set the created_by field
DROP POLICY IF EXISTS "Users can create events during recording" ON public.events;

CREATE POLICY "Users can create events during recording" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Update policies for update and delete to use created_by
DROP POLICY IF EXISTS "Users can update events from their missions" ON public.events;
DROP POLICY IF EXISTS "Users can delete events from their missions" ON public.events;

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = created_by);