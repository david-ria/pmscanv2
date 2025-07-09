import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  groupId: string;
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { groupId, email }: InvitationRequest = await req.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user has permission to invite (is member or creator of the group)
    const { data: group, error: groupError } = await supabaseClient
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new Error('Group not found');
    }

    // Check if user is creator or member
    const isCreator = group.created_by === user.id;
    let isMember = false;

    if (!isCreator) {
      const { data: membership } = await supabaseClient
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      isMember = !!membership;
    }

    if (!isCreator && !isMember) {
      throw new Error('You do not have permission to invite users to this group');
    }

    // Check if invitation already exists for this email and group
    const { data: existingInvitation } = await supabaseClient
      .from('group_invitations')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('invitee_email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      throw new Error('An invitation is already pending for this email');
    }

    // Check if user with this email is already a member
    // We'll skip this check for now since we don't have direct access to auth.users
    // This check can be implemented later with a more complex query

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create invitation
    const { error: insertError } = await supabaseClient
      .from('group_invitations')
      .insert({
        group_id: groupId,
        inviter_id: user.id,
        invitee_email: email,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to create invitation');
    }

    // Get group and inviter details for email
    const { data: groupData } = await supabaseClient
      .from('groups')
      .select('name, description')
      .eq('id', groupId)
      .single();

    const { data: inviterProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, pseudo')
      .eq('id', user.id)
      .single();

    // TODO: Send email notification here
    // For now, we'll just log the invitation details
    console.log('Invitation created:', {
      groupName: groupData?.name,
      inviterName: inviterProfile?.pseudo || `${inviterProfile?.first_name} ${inviterProfile?.last_name}`.trim() || 'Unknown',
      inviteeEmail: email,
      token,
      expiresAt: expiresAt.toISOString()
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending invitation:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: 'Check the edge function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});