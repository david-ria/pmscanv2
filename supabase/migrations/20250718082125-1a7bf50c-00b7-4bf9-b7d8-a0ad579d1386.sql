-- Drop the existing foreign key constraint that's causing the issue
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS fk_events_mission_id;

-- Create a more flexible foreign key constraint that can be deferred
-- This allows events to be created during recording before the mission is saved
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_mission_id 
FOREIGN KEY (mission_id) REFERENCES public.missions(id) 
DEFERRABLE INITIALLY DEFERRED;