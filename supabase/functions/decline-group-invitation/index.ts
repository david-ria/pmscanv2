import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeclineInvitationRequest {
  token: string;
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

    const { token }: DeclineInvitationRequest = await req.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('group_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      throw new Error('Invalid invitation');
    }

    // Verify the invitation is for the current user's email
    if (invitation.invitee_email !== user.email) {
      throw new Error('This invitation is not for your email address');
    }

    // Update invitation status
    const { error: updateError } = await supabaseClient
      .from('group_invitations')
      .update({
        status: 'declined',
        invitee_id: user.id
      })
      .eq('token', token);

    if (updateError) {
      console.error('Invitation update error:', updateError);
      throw new Error('Failed to decline invitation');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation declined' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error declining invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});