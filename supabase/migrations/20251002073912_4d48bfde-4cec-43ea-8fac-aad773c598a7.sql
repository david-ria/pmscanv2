-- Fix email harvesting vulnerability in group_invitations
-- Only the inviter who created the invitation should see the email address,
-- not all group admins

-- Drop the overly permissive policy that allows all group admins to see emails
DROP POLICY IF EXISTS "Group admins can view sent invitations" ON public.group_invitations;

-- Replace with a more restrictive policy: only the inviter can see their sent invitations
CREATE POLICY "Inviters can view their own sent invitations"
ON public.group_invitations
FOR SELECT
USING (inviter_id = auth.uid());