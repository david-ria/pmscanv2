import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const tokenHeader = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenHeader);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { token: joinToken } = await req.json();

    if (!joinToken) {
      throw new Error('Join token is required');
    }

    console.log('Processing join request with token:', joinToken, 'for user:', user.id);

    // Find the invitation by token (no relations to avoid missing FKs)
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select('id, group_id, status, expires_at')
      .eq('token', joinToken)
      .single();

    if (inviteError || !invitation) {
      console.error('Invitation lookup failed:', inviteError);
      throw new Error('Invalid invitation token');
    }

    // Validate status and expiration
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is not pending');
    }
    if (new Date(invitation.expires_at) <= new Date()) {
      throw new Error('Invitation has expired');
    }

    const groupId = invitation.group_id;

    // Optional: fetch group name for response convenience
    let groupName: string | undefined;
    const { data: groupMeta } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();
    groupName = groupMeta?.name;

    // Check if user is already a member (idempotency)
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      console.log('User already a member, returning success');
      return new Response(
        JSON.stringify({ 
          success: true, 
          groupId, 
          alreadyMember: true,
          groupName
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add user to group
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
      });

    if (membershipError) {
      console.error('Error adding member:', membershipError);
      throw new Error('Failed to join group');
    }

    // Update invitation status only if it's a personal (email-based) invitation
    // For generic invitations (empty email), keep status as 'pending' for reuse
    const { data: invitationDetails } = await supabase
      .from('group_invitations')
      .select('invitee_email')
      .eq('id', invitation.id)
      .single();

    if (invitationDetails?.invitee_email && invitationDetails.invitee_email.trim() !== '') {
      // Personal invitation - mark as accepted
      await supabase
        .from('group_invitations')
        .update({ 
          status: 'accepted',
          invitee_id: user.id 
        })
        .eq('id', invitation.id);
    } else {
      // Generic invitation - keep as pending but record the user joined
      console.log('Generic invitation used - keeping status as pending for reuse');
    }

    console.log('Successfully added user to group:', groupId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        groupId,
        groupName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in join-group-by-token:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
