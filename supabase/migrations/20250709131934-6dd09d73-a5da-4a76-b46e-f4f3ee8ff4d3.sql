-- Update the handle_new_user_role function to make david@riallant.com super admin by default
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

-- Also update existing david@riallant.com user to super_admin if exists
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'david@riallant.com'
);