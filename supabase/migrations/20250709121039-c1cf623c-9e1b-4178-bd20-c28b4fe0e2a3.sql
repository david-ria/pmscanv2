-- Fix group_invitations RLS policies to avoid auth.users table access

-- Drop all existing policies for group_invitations
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.group_invitations;
DROP POLICY IF EXISTS "Group members can create invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Users can update invitations they received" ON public.group_invitations;

-- Create simplified policies that don't reference auth.users
CREATE POLICY "Users can view their own invitations" 
ON public.group_invitations 
FOR SELECT 
USING (
  inviter_id = auth.uid() OR 
  invitee_id = auth.uid()
);

CREATE POLICY "Users can create invitations for their groups" 
ON public.group_invitations 
FOR INSERT 
WITH CHECK (
  inviter_id = auth.uid() AND
  (
    -- User is creator of the group
    group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()) OR
    -- User is member of the group
    group_id IN (SELECT group_id FROM public.group_memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update their received invitations" 
ON public.group_invitations 
FOR UPDATE 
USING (invitee_id = auth.uid());