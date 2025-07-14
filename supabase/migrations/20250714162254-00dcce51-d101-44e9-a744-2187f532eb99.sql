-- Add constraint to prevent duplicate mission names per user
-- This will help prevent the duplicate key violations we're seeing

-- First, let's add an index on missions for better performance
CREATE INDEX IF NOT EXISTS idx_missions_user_name ON public.missions(user_id, name);

-- Add a unique constraint on user_id + name combination to prevent duplicate missions
-- Note: We'll use a partial unique constraint that handles NULL user_id
ALTER TABLE public.missions 
ADD CONSTRAINT unique_mission_name_per_user 
UNIQUE (user_id, name) 
DEFERRABLE INITIALLY DEFERRED;

-- For missions without user_id (system generated), we'll add a separate constraint
-- This uses a partial unique index for cases where user_id is NULL
CREATE UNIQUE INDEX IF NOT EXISTS unique_system_mission_name 
ON public.missions (name) 
WHERE user_id IS NULL;