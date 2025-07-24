-- Fix 1: Remove hardcoded super admin email and create a proper role assignment system
-- First, let's update the handle_new_user_role function to not hardcode emails

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Default all new users to 'user' role
  -- Super admin assignment should be done manually through proper channels
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- Fix 2: Add a secure function for role elevation that requires existing super admin
CREATE OR REPLACE FUNCTION public.elevate_user_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only super admins can elevate roles
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Insufficient privileges to elevate user roles';
  END IF;
  
  -- Prevent elevation to super_admin (must be done manually)
  IF new_role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin role cannot be assigned through this function';
  END IF;
  
  -- Update the user's role
  UPDATE public.user_roles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$function$;

-- Fix 3: Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  change_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view all audit logs" 
ON public.role_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

-- System can insert audit logs
CREATE POLICY "System can create audit logs" 
ON public.role_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Fix 4: Update role elevation function to include audit logging
CREATE OR REPLACE FUNCTION public.elevate_user_role(
  target_user_id uuid, 
  new_role app_role, 
  change_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix 5: Add function to safely initialize first super admin (one-time use)
CREATE OR REPLACE FUNCTION public.initialize_super_admin(target_user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;