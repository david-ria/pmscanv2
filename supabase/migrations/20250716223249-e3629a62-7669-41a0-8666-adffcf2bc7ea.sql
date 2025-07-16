-- Fix RLS policies to protect user mission and measurement data

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view missions" ON public.missions;
DROP POLICY IF EXISTS "Anyone can create missions" ON public.missions;
DROP POLICY IF EXISTS "Anyone can update missions" ON public.missions;
DROP POLICY IF EXISTS "Anyone can delete missions" ON public.missions;

DROP POLICY IF EXISTS "Anyone can view measurements" ON public.measurements;
DROP POLICY IF EXISTS "Anyone can create measurements" ON public.measurements;
DROP POLICY IF EXISTS "Anyone can update measurements" ON public.measurements;
DROP POLICY IF EXISTS "Anyone can delete measurements" ON public.measurements;

-- Create secure policies for missions
CREATE POLICY "Users can view their own missions" 
ON public.missions 
FOR SELECT 
USING (auth.uid() = user_id OR shared = true);

CREATE POLICY "Users can create their own missions" 
ON public.missions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own missions" 
ON public.missions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own missions" 
ON public.missions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create secure policies for measurements (linked to missions)
CREATE POLICY "Users can view measurements from their missions" 
ON public.measurements 
FOR SELECT 
USING (
  mission_id IN (
    SELECT id FROM public.missions 
    WHERE user_id = auth.uid() OR shared = true
  )
);

CREATE POLICY "Users can create measurements for their missions" 
ON public.measurements 
FOR INSERT 
WITH CHECK (
  mission_id IN (
    SELECT id FROM public.missions 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update measurements from their missions" 
ON public.measurements 
FOR UPDATE 
USING (
  mission_id IN (
    SELECT id FROM public.missions 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete measurements from their missions" 
ON public.measurements 
FOR DELETE 
USING (
  mission_id IN (
    SELECT id FROM public.missions 
    WHERE user_id = auth.uid()
  )
);