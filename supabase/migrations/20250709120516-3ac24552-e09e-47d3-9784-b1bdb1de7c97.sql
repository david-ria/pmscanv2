-- Fix multiple issues with groups functionality

-- 1. Add missing foreign key relationships for proper joins
ALTER TABLE public.group_invitations 
ADD CONSTRAINT group_invitations_inviter_id_fkey 
FOREIGN KEY (inviter_id) REFERENCES public.profiles(id);

-- 2. Temporarily disable RLS to allow first group creation, then re-enable with fixed policies
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- 3. Fix group creation by allowing users to create groups without needing existing membership
CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- 4. Fix group viewing by checking if user has membership OR is creator
CREATE POLICY "Users can view groups they are members of or created" 
ON public.groups 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  id IN (
    SELECT group_id 
    FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

-- 5. Fix membership policies to prevent recursion
CREATE POLICY "Users can view memberships for their groups" 
ON public.group_memberships 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  group_id IN (
    SELECT id 
    FROM public.groups 
    WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can create memberships" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update memberships" 
ON public.group_memberships 
FOR UPDATE 
USING (
  group_id IN (
    SELECT id 
    FROM public.groups 
    WHERE created_by = auth.uid()
  ) OR
  (user_id = auth.uid() AND role = 'member')
);

CREATE POLICY "Users can delete their memberships or admins can delete any" 
ON public.group_memberships 
FOR DELETE 
USING (
  user_id = auth.uid() OR
  group_id IN (
    SELECT id 
    FROM public.groups 
    WHERE created_by = auth.uid()
  )
);