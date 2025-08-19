-- High Priority Security Fixes

-- Fix 1: Secure Location Enrichment Data (CRITICAL)
-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Location enrichment data is publicly readable" ON public.location_enrichment_data;

-- Fix 2: Secure Group Memberships (HIGH) 
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view memberships" ON public.group_memberships;

-- Create restricted group membership viewing policy
CREATE POLICY "Users can view memberships for their groups" 
ON public.group_memberships 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Fix 3: Enhance Database Function Security (MEDIUM)
-- Update security-sensitive functions with explicit search_path

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'moderator' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.elevate_user_role(target_user_id uuid, new_role app_role, change_reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_role_value app_role;
BEGIN
  -- Only super admins can elevate roles
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Insufficient privileges to elevate user roles';
  END IF;
  
  -- Prevent elevation to super_admin (must be done manually)
  IF new_role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin role cannot be assigned through this function';
  END IF;
  
  -- Get current role for audit log
  SELECT role INTO old_role_value 
  FROM public.user_roles 
  WHERE user_id = target_user_id;
  
  -- Update the user's role
  UPDATE public.user_roles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the change
  INSERT INTO public.role_audit_log (
    target_user_id, 
    changed_by, 
    old_role, 
    new_role, 
    change_reason
  ) VALUES (
    target_user_id, 
    auth.uid(), 
    old_role_value, 
    new_role, 
    change_reason
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_super_admin(target_user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id uuid;
  existing_super_admin_count integer;
BEGIN
  -- Check if any super admin already exists
  SELECT COUNT(*) INTO existing_super_admin_count
  FROM public.user_roles
  WHERE role = 'super_admin';
  
  IF existing_super_admin_count > 0 THEN
    RAISE EXCEPTION 'Super admin already exists. Use role elevation functions instead.';
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_user_email;
  END IF;
  
  -- Update to super admin
  UPDATE public.user_roles 
  SET role = 'super_admin', updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the initialization
  INSERT INTO public.role_audit_log (
    target_user_id, 
    changed_by, 
    old_role, 
    new_role, 
    change_reason
  ) VALUES (
    target_user_id, 
    target_user_id, -- Self-initialization
    'user', 
    'super_admin', 
    'Initial super admin setup'
  );
  
  RETURN TRUE;
END;
$$;