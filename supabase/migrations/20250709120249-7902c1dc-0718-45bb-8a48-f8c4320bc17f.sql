-- Fix RLS policies for groups table to avoid recursion issues

-- Drop existing problematic policies for groups
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON public.groups;

-- Create new policies using security definer functions
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Group admins can update groups" 
ON public.groups 
FOR UPDATE 
USING (public.is_group_admin(auth.uid(), id));

CREATE POLICY "Group admins can delete groups" 
ON public.groups 
FOR DELETE 
USING (public.is_group_admin(auth.uid(), id));