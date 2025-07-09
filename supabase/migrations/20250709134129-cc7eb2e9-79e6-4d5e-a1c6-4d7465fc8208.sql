-- Manually assign super_admin role to david@riallant.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('79d3c0d6-fdd0-419b-9b69-8c7d6b75440a', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also check if the trigger is working properly by updating it
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Check if the user email is david@riallant.com and assign super_admin role
  IF NEW.email = 'david@riallant.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$function$;