import { useState, useEffect, useCallback } from 'react';
import { invokeFunction } from '@/lib/api/client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  role?: string;
  member_count?: number;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user_profile?: {
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
  const { toast } = useToast();

  const fetchGroups = useCallback(async () => {
    try {
      // Get current user first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*');

      if (groupsError) throw groupsError;

      // Then fetch memberships separately to avoid aggregate issues
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('group_memberships')
        .select('group_id, role, user_id');

      if (membershipsError) throw membershipsError;

      // Combine the data
      const groupsWithRole =
        groupsData?.map((group) => {
          const userMembership = membershipsData?.find(
            (m) => m.group_id === group.id && m.user_id === user.id
          );
          const memberCount =
            membershipsData?.filter((m) => m.group_id === group.id).length || 0;

          return {
            ...group,
            role: userMembership?.role,
            member_count: memberCount,
          };
        }) || [];

      setGroups(groupsWithRole);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create group',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchGroups, toast]);

  const updateGroup = useCallback(async (
    groupId: string,
    updates: { name?: string; description?: string }
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update group',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete group',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave group',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchGroups, toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
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
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          id,
          group_id,
          user_id,
          role,
          joined_at,
          profiles!group_memberships_user_id_fkey(first_name, last_name, pseudo)
        `
        )
        .eq('group_id', groupId);

      if (error) throw error;

      const membersWithProfiles =
        data?.map((member) => ({
          id: member.id,
          group_id: member.group_id,
          user_id: member.user_id,
          role: member.role as 'admin' | 'member',
          joined_at: member.joined_at,
          user_profile: Array.isArray(member.profiles)
            ? member.profiles[0]
            : member.profiles,
        })) || [];

      setMembers(membersWithProfiles);
    } catch (error: any) {
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update member role',
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
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
        .gt('expires_at', new Date().toISOString()); // Keep for database compatibility

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
    } catch (error: any) {
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
      await invokeFunction('send-group-invitation', { groupId, email });

      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      await invokeFunction('accept-group-invitation', { token });

      toast({
        title: 'Success',
        description: 'Invitation accepted successfully',
      });

      await fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const declineInvitation = async (token: string) => {
    try {
      await invokeFunction('decline-group-invitation', { token });

      toast({
        title: 'Success',
        description: 'Invitation declined',
      });

      await fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline invitation',
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
