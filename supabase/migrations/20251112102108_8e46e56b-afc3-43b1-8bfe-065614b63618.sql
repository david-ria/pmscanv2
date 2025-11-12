-- Replace group logo storage policies to match new path scheme group-logos/{groupId}/{filename}
DROP POLICY IF EXISTS "Group admins can upload group logos" ON storage.objects;
DROP POLICY IF EXISTS "Group admins can update group logos" ON storage.objects;
DROP POLICY IF EXISTS "Group admins can delete group logos" ON storage.objects;
DROP POLICY IF EXISTS "Group logos are publicly viewable" ON storage.objects;

-- Allow group admins or creators to upload logos
CREATE POLICY "Group admins can upload group logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos'
  AND (storage.foldername(name))[1] = 'group-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.user_id = auth.uid()
      AND gm.role = 'admin'
      AND gm.group_id = ((storage.foldername(name))[2])::uuid
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.created_by = auth.uid()
      AND g.id = ((storage.foldername(name))[2])::uuid
    )
  )
);

-- Allow update (replace)
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
      AND gm.group_id = ((storage.foldername(name))[2])::uuid
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.created_by = auth.uid()
      AND g.id = ((storage.foldername(name))[2])::uuid
    )
  )
);

-- Allow delete
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
      AND gm.group_id = ((storage.foldername(name))[2])::uuid
    )
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.created_by = auth.uid()
      AND g.id = ((storage.foldername(name))[2])::uuid
    )
  )
);

-- Public read for group logos
CREATE POLICY "Group logos are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'event-photos'
  AND (storage.foldername(name))[1] = 'group-logos'
);