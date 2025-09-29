-- Fix group_invitations email exposure vulnerability
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their groups" ON public.group_invitations;
DROP POLICY IF EXISTS "Users can update their received invitations" ON public.group_invitations;

-- Create secure policies that prevent email harvesting

-- Policy 1: Users can only view invitations where they are the inviter
-- This allows group admins to see invitations they sent
CREATE POLICY "Inviters can view their own sent invitations" 
ON public.group_invitations 
FOR SELECT 
USING (inviter_id = auth.uid());

-- Policy 2: Users can only view invitations specifically sent to their user ID
-- This prevents access to pending invitations with null invitee_id
CREATE POLICY "Users can view invitations sent to them" 
ON public.group_invitations 
FOR SELECT 
USING (invitee_id = auth.uid() AND invitee_id IS NOT NULL);

-- Policy 3: Users can only view invitations sent to their email address
-- This allows users to see invitations before they register/accept
CREATE POLICY "Users can view invitations sent to their email" 
ON public.group_invitations 
FOR SELECT 
USING (
  invitee_email = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- Policy 4: Secure invitation creation - only group admins can create invitations
CREATE POLICY "Group admins can create invitations" 
ON public.group_invitations 
FOR INSERT 
WITH CHECK (
  inviter_id = auth.uid() 
  AND (
    -- User is group creator
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
    OR
    -- User is group admin
    group_id IN (
      SELECT group_id 
      FROM public.group_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- Policy 5: Users can only update invitations sent to their user ID
CREATE POLICY "Users can update their received invitations" 
ON public.group_invitations 
FOR UPDATE 
USING (invitee_id = auth.uid() AND invitee_id IS NOT NULL);