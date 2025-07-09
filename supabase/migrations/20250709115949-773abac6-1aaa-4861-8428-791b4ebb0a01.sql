-- Create security definer functions to avoid infinite recursion in RLS policies

-- Function to check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Function to check if user is admin of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role = 'admin'
  )
$$;

-- Function to get user's group IDs
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT group_id
    FROM public.group_memberships
    WHERE user_id = _user_id
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view group memberships for their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Group admins can update memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.group_memberships;

-- Create new policies using security definer functions
CREATE POLICY "Users can view group memberships for their groups" 
ON public.group_memberships 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  public.is_group_member(auth.uid(), group_id)
);

CREATE POLICY "Group admins can update memberships" 
ON public.group_memberships 
FOR UPDATE 
USING (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Users can delete their own memberships" 
ON public.group_memberships 
FOR DELETE 
USING (
  user_id = auth.uid() OR
  public.is_group_admin(auth.uid(), group_id)
);