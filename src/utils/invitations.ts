import { supabase } from '@/integrations/supabase/client';
import { generateGroupUrl } from '@/lib/groupConfigs';

/**
 * Create a shareable join link with token for a group
 */
export async function createGroupJoinLink(
  groupId: string,
  groupName?: string
): Promise<{ url: string; token: string; expiresAt: string }> {
  const { data, error } = await supabase.functions.invoke('create-group-join-link', {
    body: { groupId },
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
    throw new Error('Failed to join group');
  }

  return data;
}
