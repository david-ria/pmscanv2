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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { token: joinToken } = await req.json();

    if (!joinToken) {
      throw new Error('Join token is required');
    }

    console.log('Processing join request with token:', joinToken, 'for user:', user.id);

    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select('*, groups(id, name)')
      .eq('token', joinToken)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      console.error('Invalid or expired token:', inviteError);
      throw new Error('Invalid or expired invitation token');
    }

    const groupId = invitation.group_id;

    // Check if user is already a member (idempotency)
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      console.log('User already a member, returning success');
      return new Response(
        JSON.stringify({ 
          success: true, 
          groupId, 
          alreadyMember: true,
          groupName: invitation.groups?.name 
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

    // Update invitation status
    await supabase
      .from('group_invitations')
      .update({ 
        status: 'accepted',
        invitee_id: user.id 
      })
      .eq('id', invitation.id);

    console.log('Successfully added user to group:', groupId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        groupId,
        groupName: invitation.groups?.name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in join-group-by-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
