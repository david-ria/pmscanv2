-- Fix remaining security warnings

-- 1. Fix function search path issues for existing functions
ALTER FUNCTION public.get_user_role(uuid) SET search_path = 'public';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = 'public';
ALTER FUNCTION public.is_group_member(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.is_group_admin(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_group_ids(uuid) SET search_path = 'public';
ALTER FUNCTION public.is_user_in_group(uuid, uuid) SET search_path = 'public';

-- 2. Enable password leak protection and set reasonable OTP expiry
-- Note: These settings require Supabase dashboard configuration
-- The user will need to manually enable these in the Auth settings:
-- - Enable password leak protection in Auth > Settings > Password Protection
-- - Set OTP expiry to 300 seconds (5 minutes) in Auth > Settings > Email OTP Expiry