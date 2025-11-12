-- Add logo_url to groups table
ALTER TABLE public.groups
ADD COLUMN logo_url TEXT;

COMMENT ON COLUMN public.groups.logo_url IS 'URL to the group logo image stored in Supabase storage';