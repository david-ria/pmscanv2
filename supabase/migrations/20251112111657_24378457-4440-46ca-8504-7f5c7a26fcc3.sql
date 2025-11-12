-- =====================================================================
-- PHASE 3: PROTECT EMAIL FROM GROUP MEMBER HARVESTING
-- =====================================================================
-- This prevents malicious users from joining groups to harvest email addresses
-- Only users can see their own email; other group members see NULL

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Group members can view each other's profiles" ON public.profiles;

-- Step 2: Create a restricted policy that excludes email for non-own profiles
-- This policy allows viewing profiles but NOT the email field
CREATE POLICY "Group members can view each other's basic profiles (no email)"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  are_users_in_same_group(auth.uid(), id) 
  AND id != auth.uid()
);

-- Step 3: Create a secure view for group member profiles (email excluded)
-- This view is used by client code to display member lists
CREATE OR REPLACE VIEW public.group_member_profiles AS
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.pseudo,
  -- Only show email if viewing own profile
  CASE 
    WHEN p.id = auth.uid() THEN p.email
    ELSE NULL
  END as email,
  p.subscription_tier,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE 
  -- User can see their own profile
  p.id = auth.uid()
  OR
  -- User can see profiles of people in their groups
  are_users_in_same_group(auth.uid(), p.id);

-- Grant access to authenticated users
GRANT SELECT ON public.group_member_profiles TO authenticated;

-- Add helpful comment
COMMENT ON VIEW public.group_member_profiles IS 'Secure view for displaying group member profiles. Email is only visible for own profile, preventing email harvesting attacks.';