import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { offlineAwareSupabase } from '@/lib/supabaseSafeWrapper';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  subscription_tier?: string | null;
  member_quota?: number | null;
  custom_locations?: Record<string, any> | null;
  custom_activities?: Record<string, any> | null;
  role?: string;
  member_count?: number;
  group_settings?: Array<{
    custom_alarms: any[];
    pm25_threshold?: number;
    pm10_threshold?: number;
    pm1_threshold?: number;
    alarm_enabled?: boolean;
    auto_share_stats?: boolean;
    notification_frequency?: string;
    location_auto_detect?: boolean;
    activity_auto_suggest?: boolean;
    event_notifications?: boolean;
    weekly_reports?: boolean;
  }>;
  group_events?: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    enabled: boolean;
  }>;
  group_custom_thresholds?: Array<{
    id: string;
    name: string;
    pm1_min?: number;
    pm1_max?: number;
    pm25_min?: number;
    pm25_max?: number;
    pm10_min?: number;
    pm10_max?: number;
    color?: string;
    enabled: boolean;
  }>;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    pseudo: string | null;
  };
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id: string | null;
  status: 'pending' | 'accepted' | 'declined';
  token: string;
  expires_at: string;
  created_at: string;
  group?: {
    name: string;
    description: string | null;
  };
  inviter_profile?: {
    first_name: string | null;
    last_name: string | null;
    pseudo: string | null;
  };
}

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchGroups = useCallback(async (isRetry = false) => {
    if (!user?.id) {
      setGroups([]);
      setLoading(false);
      setError(null);
      hasInitialized.current = true;
      return;
    }

    // Prevent excessive API calls during retries
    if (isRetry && retryCount.current >= maxRetries) {
      setError('Max retries exceeded');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch groups first (no embedded relations; we'll merge manually)
      const groupsQuery = supabase.from('groups').select('*');
      const { data: groupsData, error: groupsError, isOffline: groupsOffline } =
        await offlineAwareSupabase.query(groupsQuery);

      if (groupsOffline) {
        setLoading(false);
        return; // Silently fail when offline
      }
      if (groupsError) throw groupsError;

      const groupIds = (groupsData || []).map((g: any) => g.id);

      // Fetch related tables in parallel and merge by group_id
      const [
        { data: eventsData, error: eventsError, isOffline: eventsOffline },
        { data: thresholdsData, error: thresholdsError, isOffline: thresholdsOffline },
        { data: settingsData, error: settingsError, isOffline: settingsOffline },
        { data: membershipsData, error: membershipsError, isOffline: membershipsOffline },
      ] = await Promise.all([
        offlineAwareSupabase.query(
          groupIds.length
            ? supabase
                .from('group_events')
                .select('id, group_id, name, description, icon, color, enabled')
                .in('group_id', groupIds)
            : supabase.from('group_events').select('id').limit(0)
        ),
        offlineAwareSupabase.query(
          groupIds.length
            ? supabase
                .from('group_custom_thresholds')
                .select('id, group_id, name, pm1_min, pm1_max, pm25_min, pm25_max, pm10_min, pm10_max, color, enabled')
                .in('group_id', groupIds)
            : supabase.from('group_custom_thresholds').select('id').limit(0)
        ),
        offlineAwareSupabase.query(
          groupIds.length
            ? supabase
                .from('group_settings')
                .select('group_id, custom_alarms, pm25_threshold, pm10_threshold, pm1_threshold, alarm_enabled, auto_share_stats, notification_frequency, location_auto_detect, activity_auto_suggest, event_notifications, weekly_reports')
                .in('group_id', groupIds)
            : supabase.from('group_settings').select('group_id').limit(0)
        ),
        offlineAwareSupabase.query(
          supabase.from('group_memberships').select('group_id, role, user_id')
        ),
      ]);

      if (eventsOffline || thresholdsOffline || settingsOffline || membershipsOffline) {
        setLoading(false);
        return; // Silently fail when offline
      }
      if (eventsError) throw eventsError;
      if (thresholdsError) throw thresholdsError;
      if (settingsError) throw settingsError;
      if (membershipsError) throw membershipsError;

      // Index related data by group_id
      const eventsByGroup = new Map<string, any[]>();
      eventsData?.forEach((e: any) => {
        const arr = eventsByGroup.get(e.group_id) || [];
        arr.push(e);
        eventsByGroup.set(e.group_id, arr);
      });

      const thresholdsByGroup = new Map<string, any[]>();
      thresholdsData?.forEach((t: any) => {
        const arr = thresholdsByGroup.get(t.group_id) || [];
        arr.push(t);
        thresholdsByGroup.set(t.group_id, arr);
      });

      const settingsByGroup = new Map<string, any>();
      settingsData?.forEach((s: any) => {
        settingsByGroup.set(s.group_id, s);
      });

      // Combine the data
      const groupsWithRole =
        groupsData?.map((group: any) => {
          const userMembership = membershipsData?.find(
            (m: any) => m.group_id === group.id && m.user_id === user.id
          );
          const memberCount =
            membershipsData?.filter((m: any) => m.group_id === group.id).length || 0;

          return {
            ...group,
            role: userMembership?.role,
            member_count: memberCount,
            group_events: eventsByGroup.get(group.id) || [],
            group_custom_thresholds: thresholdsByGroup.get(group.id) || [],
            group_settings: settingsByGroup.get(group.id)
              ? [settingsByGroup.get(group.id)]
              : [],
          };
        }) || [];

      setGroups(groupsWithRole as Group[]);
      hasInitialized.current = true;
      retryCount.current = 0; // Reset retry count on success
    } catch (error: unknown) {
      // Don't show error toast when offline
      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      if (isRetry) {
        retryCount.current++;
        // Exponential backoff for retries
        setTimeout(() => fetchGroups(true), Math.pow(2, retryCount.current) * 1000);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch groups',
          variant: 'destructive',
        });
      }
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id, maxRetries]);

  const createGroup = useCallback(async (name: string, description?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group created successfully',
      });

      await fetchGroups();
      return data;
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create group',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchGroups, toast]);

  const updateGroup = useCallback(async (
    groupId: string,
    updates: { 
      name?: string; 
      description?: string; 
      subscription_tier?: 'free' | 'premium' | 'enterprise'; 
      member_quota?: number; 
      custom_locations?: Record<string, string[]>; 
      custom_activities?: Record<string, string[]>;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group updated successfully',
      });

      await fetchGroups();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update group',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchGroups, toast]);

  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group deleted successfully',
      });

      await fetchGroups();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete group',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchGroups, toast]);

  const leaveGroup = useCallback(async (groupId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Left group successfully',
      });

      await fetchGroups();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to leave group',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchGroups, toast]);

  useEffect(() => {
    // Only fetch once when user becomes available and we haven't initialized
    if (user?.id && !hasInitialized.current) {
      fetchGroups();
    }
    // Reset initialization when user changes
    if (!user?.id) {
      hasInitialized.current = false;
      retryCount.current = 0;
    }
  }, [user?.id, fetchGroups]);

  // Auto-refetch when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [useGroups] Network back online, refetching groups...');
      if (user?.id) {
        fetchGroups();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user?.id, fetchGroups]);

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    refetch: fetchGroups,
  };
};

export const useGroupMembers = (groupId: string) => {
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
    try {
      // First fetch memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('group_memberships')
        .select('id, group_id, user_id, role, joined_at')
        .eq('group_id', groupId);

      if (membershipError) throw membershipError;

      // Then fetch profiles for each user
      if (memberships && memberships.length > 0) {
        const userIds = memberships.map(m => m.user_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, pseudo')
          .in('id', userIds);

        if (profileError) throw profileError;

        // Combine memberships with profiles
        const membersWithProfiles = memberships.map((member) => {
          const profile = profiles?.find(p => p.id === member.user_id);
          return {
            id: member.id,
            group_id: member.group_id,
            user_id: member.user_id,
            role: member.role as 'admin' | 'member',
            joined_at: member.joined_at,
            profiles: profile || null,
          };
        });

        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error: unknown) {
      console.error('Error fetching group members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch group members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (
    membershipId: string,
    role: 'admin' | 'member'
  ) => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .update({ role })
        .eq('id', membershipId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });

      await fetchMembers();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update member role',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });

      await fetchMembers();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId]);

  return {
    members,
    loading,
    updateMemberRole,
    removeMember,
    refetch: fetchMembers,
  };
};

export const useGroupInvitations = () => {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    try {
      // Fetch invitations without complex joins to avoid relationship errors
      const { data: invitationsData, error } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      // Fetch related data separately
      const groupIds = [
        ...new Set(invitationsData?.map((i) => i.group_id) || []),
      ];
      const inviterIds = [
        ...new Set(invitationsData?.map((i) => i.inviter_id) || []),
      ];

      const [groupsData, profilesData] = await Promise.all([
        groupIds.length > 0
          ? supabase
              .from('groups')
              .select('id, name, description')
              .in('id', groupIds)
          : Promise.resolve({ data: [] }),
        inviterIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, first_name, last_name, pseudo')
              .in('id', inviterIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Combine the data
      const invitationsWithDetails =
        invitationsData?.map((invitation) => ({
          id: invitation.id,
          group_id: invitation.group_id,
          inviter_id: invitation.inviter_id,
          invitee_email: invitation.invitee_email,
          invitee_id: invitation.invitee_id,
          status: invitation.status as 'pending' | 'accepted' | 'declined',
          token: invitation.token,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          group:
            groupsData.data?.find((g) => g.id === invitation.group_id) || null,
          inviter_profile:
            profilesData.data?.find((p) => p.id === invitation.inviter_id) ||
            null,
        })) || [];

      setInvitations(invitationsWithDetails);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to fetch invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (groupId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        'send-group-invitation',
        {
          body: { groupId, email },
        }
      );

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        'accept-group-invitation',
        {
          body: { token },
        }
      );

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation accepted successfully',
      });

      await fetchInvitations();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept invitation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const declineInvitation = async (token: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        'decline-group-invitation',
        {
          body: { token },
        }
      );

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation declined',
      });

      await fetchInvitations();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to decline invitation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  return {
    invitations,
    loading,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    refetch: fetchInvitations,
  };
};
