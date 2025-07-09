-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_invitations table
CREATE TABLE public.group_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_memberships table
CREATE TABLE public.group_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_settings table
CREATE TABLE public.group_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE UNIQUE,
  pm25_threshold REAL DEFAULT 25.0,
  pm10_threshold REAL DEFAULT 50.0,
  pm1_threshold REAL DEFAULT 15.0,
  alarm_enabled BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'hourly', 'daily')),
  auto_share_stats BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_shared_statistics table
CREATE TABLE public.group_shared_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  avg_pm25 REAL NOT NULL,
  avg_pm10 REAL NOT NULL,
  avg_pm1 REAL NOT NULL,
  max_pm25 REAL NOT NULL,
  total_measurements INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_shared_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (
  id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" 
ON public.groups 
FOR UPDATE 
USING (
  id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group admins can delete groups" 
ON public.groups 
FOR DELETE 
USING (
  id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for group_invitations
CREATE POLICY "Users can view invitations they sent or received" 
ON public.group_invitations 
FOR SELECT 
USING (
  inviter_id = auth.uid() OR 
  invitee_id = auth.uid() OR
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Group members can create invitations" 
ON public.group_invitations 
FOR INSERT 
WITH CHECK (
  inviter_id = auth.uid() AND
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invitations they received" 
ON public.group_invitations 
FOR UPDATE 
USING (
  invitee_id = auth.uid() OR
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- RLS Policies for group_memberships
CREATE POLICY "Users can view group memberships for their groups" 
ON public.group_memberships 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own memberships" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Group admins can update memberships" 
ON public.group_memberships 
FOR UPDATE 
USING (
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can delete their own memberships" 
ON public.group_memberships 
FOR DELETE 
USING (
  user_id = auth.uid() OR
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for group_settings
CREATE POLICY "Group members can view settings" 
ON public.group_settings 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage settings" 
ON public.group_settings 
FOR ALL 
USING (
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for group_shared_statistics
CREATE POLICY "Group members can view shared statistics" 
ON public.group_shared_statistics 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own shared statistics" 
ON public.group_shared_statistics 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  group_id IN (
    SELECT group_id FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own shared statistics" 
ON public.group_shared_statistics 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create triggers for updated_at columns
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_invitations_updated_at
BEFORE UPDATE ON public.group_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_settings_updated_at
BEFORE UPDATE ON public.group_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_group_memberships_user_id ON public.group_memberships(user_id);
CREATE INDEX idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX idx_group_invitations_token ON public.group_invitations(token);
CREATE INDEX idx_group_invitations_invitee_email ON public.group_invitations(invitee_email);
CREATE INDEX idx_group_shared_statistics_group_date ON public.group_shared_statistics(group_id, date);

-- Function to automatically create group settings when a group is created
CREATE OR REPLACE FUNCTION public.create_default_group_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_settings (group_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_group_settings_trigger
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.create_default_group_settings();

-- Function to automatically add creator as admin when group is created
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_memberships (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_group_creator_trigger
AFTER INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.add_group_creator_as_admin();