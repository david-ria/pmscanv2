-- Fix circular dependency in group_memberships RLS policy

-- Drop the problematic circular policy
DROP POLICY IF EXISTS "Users can view memberships for their groups" ON public.group_memberships;

-- Create two separate, non-circular policies
CREATE POLICY "Users can view their own group memberships" 
ON public.group_memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view other memberships in their groups" 
ON public.group_memberships 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_memberships gm 
    WHERE gm.user_id = auth.uid() 
    AND gm.group_id = group_memberships.group_id
  )
);