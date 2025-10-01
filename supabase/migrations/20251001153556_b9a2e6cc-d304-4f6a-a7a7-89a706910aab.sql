-- Create security definer function to safely get user email
-- This prevents direct access to auth.users table and potential enumeration
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text
  FROM auth.users
  WHERE id = _user_id
$$;

-- Drop the problematic policy that directly accesses auth.users
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.group_invitations;

-- Create improved policy using the security definer function
-- This restricts access to only pending invitations sent to the user's email
CREATE POLICY "Users can view pending invitations sent to their email"
ON public.group_invitations
FOR SELECT
USING (
  invitee_email = public.get_user_email(auth.uid())
  AND status = 'pending'
  AND expires_at > now()
);

-- Add policy to allow users to see their accepted/declined invitations by invitee_id
-- This avoids exposing emails for already processed invitations
CREATE POLICY "Users can view their processed invitations"
ON public.group_invitations
FOR SELECT
USING (
  invitee_id = auth.uid()
  AND status IN ('accepted', 'declined')
);

-- Ensure inviters can only see invitations for groups they admin
-- Update the existing policy to be more restrictive
DROP POLICY IF EXISTS "Inviters can view their own sent invitations" ON public.group_invitations;

CREATE POLICY "Group admins can view sent invitations"
ON public.group_invitations
FOR SELECT
USING (
  inviter_id = auth.uid()
  AND (
    group_id IN (
      SELECT id FROM public.groups WHERE created_by = auth.uid()
    )
    OR
    group_id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);