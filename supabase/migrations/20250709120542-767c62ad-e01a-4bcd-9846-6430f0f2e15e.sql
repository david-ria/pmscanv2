-- Fix RLS policies by dropping and recreating them properly

-- Drop all existing policies for groups and group_memberships
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are members of or created" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON public.groups;

DROP POLICY IF EXISTS "Users can view group memberships for their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can view memberships for their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can create their own memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can create memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Group admins can update memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can delete their memberships or admins can delete any" ON public.group_memberships;

-- Add missing foreign key relationship
ALTER TABLE public.group_invitations 
DROP CONSTRAINT IF EXISTS group_invitations_inviter_id_fkey;

ALTER TABLE public.group_invitations 
ADD CONSTRAINT group_invitations_inviter_id_fkey 
FOREIGN KEY (inviter_id) REFERENCES public.profiles(id);

-- Create simplified, non-recursive policies for groups
CREATE POLICY "Anyone can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view groups they created or joined" 
ON public.groups 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  id IN (
    SELECT group_id 
    FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their groups" 
ON public.groups 
FOR DELETE 
USING (created_by = auth.uid());

-- Create simplified policies for group_memberships
CREATE POLICY "Anyone can view memberships" 
ON public.group_memberships 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create memberships" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update their own membership" 
ON public.group_memberships 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Members can delete their own membership" 
ON public.group_memberships 
FOR DELETE 
USING (user_id = auth.uid());