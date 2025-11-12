-- Add RLS policies for group logo uploads in event-photos bucket

-- Allow group admins to upload logos to their groups
CREATE POLICY "Group admins can upload group logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos' 
  AND (storage.foldername(name))[1] = 'group-logos'
  AND (
    -- Check if user is admin of the group (extract group_id from filename)
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.user_id = auth.uid()
      AND gm.role = 'admin'
      AND gm.group_id::text = split_part((storage.foldername(name))[2], '-', 1)
    )
    OR
    -- Allow if user created the group
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.created_by = auth.uid()
      AND g.id::text = split_part((storage.foldername(name))[2], '-', 1)
    )
  )
);

-- Allow group admins to update (replace) logos
CREATE POLICY "Group admins can update group logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-photos' 
  AND (storage.foldername(name))[1] = 'group-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.user_id = auth.uid()
      AND gm.role = 'admin'
      AND gm.group_id::text = split_part((storage.foldername(name))[2], '-', 1)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.created_by = auth.uid()
      AND g.id::text = split_part((storage.foldername(name))[2], '-', 1)
    )
  )
);

-- Allow group admins to delete old logos
CREATE POLICY "Group admins can delete group logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos' 
  AND (storage.foldername(name))[1] = 'group-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.user_id = auth.uid()
      AND gm.role = 'admin'
      AND gm.group_id::text = split_part((storage.foldername(name))[2], '-', 1)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.created_by = auth.uid()
      AND g.id::text = split_part((storage.foldername(name))[2], '-', 1)
    )
  )
);

-- Allow everyone to view group logos (public read)
CREATE POLICY "Group logos are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'event-photos' 
  AND (storage.foldername(name))[1] = 'group-logos'
);