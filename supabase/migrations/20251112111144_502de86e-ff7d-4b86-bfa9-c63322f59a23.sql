-- Drop the public RLS policy that exposes all group data to unauthenticated users
DROP POLICY IF EXISTS "Public can view basic group info for invitations" ON public.groups;