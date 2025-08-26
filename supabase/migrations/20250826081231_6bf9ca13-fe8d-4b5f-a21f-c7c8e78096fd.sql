-- Security Fix: Restrict shared missions to group members only
-- Drop existing policies that allow global sharing
DROP POLICY IF EXISTS "Users can view their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can view measurements from their missions" ON public.measurements;

-- Create secure policies that restrict shared data to group members
CREATE POLICY "Users can view their own and group shared missions" 
ON public.missions 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  (shared = true AND user_id IN (
    SELECT gm1.user_id 
    FROM public.group_memberships gm1 
    WHERE gm1.group_id IN (
      SELECT gm2.group_id 
      FROM public.group_memberships gm2 
      WHERE gm2.user_id = auth.uid()
    )
  ))
);

CREATE POLICY "Users can view measurements from accessible missions" 
ON public.measurements 
FOR SELECT 
USING (
  mission_id IN (
    SELECT missions.id
    FROM public.missions
    WHERE 
      missions.user_id = auth.uid()
      OR 
      (missions.shared = true AND missions.user_id IN (
        SELECT gm1.user_id 
        FROM public.group_memberships gm1 
        WHERE gm1.group_id IN (
          SELECT gm2.group_id 
          FROM public.group_memberships gm2 
          WHERE gm2.user_id = auth.uid()
        )
      ))
  )
);