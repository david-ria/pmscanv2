import { supabase } from '@/integrations/supabase/client';
import { generateGroupUrl } from '@/lib/groupConfigs';

/**
 * Create a shareable join link with token for a group
 */
export async function createGroupJoinLink(
  groupId: string,
  groupName?: string,
  expirationHours?: number
): Promise<{ url: string; token: string; expiresAt: string }> {
  const { data, error } = await supabase.functions.invoke('create-group-join-link', {
    body: { groupId, expirationHours },
  });

  if (error) {
    console.error('Error creating join link:', error);
    throw new Error('Failed to create invitation link');
  }

  const token = data.token;
  const baseUrl = generateGroupUrl(groupId, groupName);
  const fullUrl = `${baseUrl}?join=${token}`;

  return {
    url: fullUrl,
    token,
    expiresAt: data.expiresAt,
  };
}

/**
 * Join a group using a token
 */
export async function joinGroupByToken(token: string): Promise<{
  success: boolean;
  groupId: string;
  groupName?: string;
  alreadyMember?: boolean;
}> {
  const { data, error } = await supabase.functions.invoke('join-group-by-token', {
    body: { token },
  });

  if (error) {
    console.error('Error joining group:', error);
    // Try to extract error message from response
    const errorMessage = data?.error || error.message || 'Failed to join group';
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Fetch public group info using the secure edge function
 * This validates the invitation token and returns minimal group data
 */
export async function getPublicGroupInfo(
  groupId: string,
  token?: string
): Promise<{
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}> {
  const { data, error } = await supabase.functions.invoke('get-public-group-info', {
    body: { groupId, token },
  });

  if (error) {
    console.error('Error fetching public group info:', error);
    throw new Error(error.message || 'Failed to fetch group information');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
