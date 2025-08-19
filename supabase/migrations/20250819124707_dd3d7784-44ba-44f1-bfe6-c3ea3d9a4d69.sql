-- Fix infinite recursion in group_memberships RLS policy
-- The current policy references the same table it's applied to, causing recursion

-- First, create a security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_user_in_group(_user_id uuid, _group_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE user_id = _user_id AND group_id = _group_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view other memberships in their groups" ON public.group_memberships;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "Users can view other memberships in their groups"
ON public.group_memberships
FOR SELECT
USING (
  -- Users can see memberships for groups they belong to
  public.is_user_in_group(auth.uid(), group_id)
);