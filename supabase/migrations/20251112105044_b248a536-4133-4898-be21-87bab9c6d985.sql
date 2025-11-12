-- Create helper function to check if users are in the same group
CREATE OR REPLACE FUNCTION public.are_users_in_same_group(_user1_id uuid, _user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships gm1
    INNER JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = _user1_id
    AND gm2.user_id = _user2_id
  )
$$;

-- Allow group members to view profiles of other members in their groups
CREATE POLICY "Group members can view each other's profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.are_users_in_same_group(auth.uid(), id)
);

-- Allow group admins to remove members
CREATE POLICY "Group admins can remove members"
ON public.group_memberships
FOR DELETE
TO authenticated
USING (
  public.is_group_admin(auth.uid(), group_id)
  OR
  group_id IN (
    SELECT g.id
    FROM groups g
    WHERE g.created_by = auth.uid()
  )
);