-- Allow public read access to basic group information for invitation links
CREATE POLICY "Public can view basic group info for invitations"
ON public.groups
FOR SELECT
TO anon
USING (true);

-- Note: This allows public to see group name, description, and logo_url
-- which is necessary for invitation welcome pages to display branding
-- before authentication