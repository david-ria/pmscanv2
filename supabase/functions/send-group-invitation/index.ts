import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from 'https://esm.sh/zod@3.22.4';

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

    // Validate input with Zod
    const RequestSchema = z.object({
      groupId: z.string().uuid({ message: 'Invalid groupId format' }),
      email: z.string().email({ message: 'Invalid email address' }).max(255, { message: 'Email too long' })
    });

    const body = await req.json();
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validation.error.format()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { groupId, email } = validation.data;

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
      return new Response(JSON.stringify({ 
        error: 'An invitation is already pending for this email' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user with this email is already a member of the group
    // First, look up the user by email in profiles table
    const { data: inviteeProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (inviteeProfile) {
      // Check if this user is already a member of the group
      const { data: existingMembership } = await supabaseClient
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', inviteeProfile.id)
        .maybeSingle();

      if (existingMembership) {
        console.log('User is already a member:', { email, groupId });
        return new Response(JSON.stringify({ 
          error: 'User is already a member of this group' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

    // Send email notification
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const inviterName = inviterProfile?.pseudo || `${inviterProfile?.first_name} ${inviterProfile?.last_name}`.trim() || 'Unknown';
    
    try {
      const emailResponse = await resend.emails.send({
        from: 'Air Quality Monitor <onboarding@resend.dev>',
        to: [email],
        subject: `Invitation to join "${groupData?.name}" group`,
        html: `
          <h1>You're invited to join a group!</h1>
          <p><strong>${inviterName}</strong> has invited you to join the <strong>"${groupData?.name}"</strong> group in the Air Quality Monitor app.</p>
          ${groupData?.description ? `<p><em>${groupData.description}</em></p>` : ''}
          
          <h2>What's next?</h2>
          <p>To accept this invitation:</p>
          <ol>
            <li>Sign up or log in to the Air Quality Monitor app</li>
            <li>Go to the Groups section</li>
            <li>Check your pending invitations</li>
            <li>Accept the invitation from ${inviterName}</li>
          </ol>
          
          <p><strong>Note:</strong> This invitation will expire on ${new Date(expiresAt).toLocaleDateString()}.</p>
          
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          
          <p>Best regards,<br>
          The Air Quality Monitor Team</p>
        `,
      });

      console.log('Email sent successfully:', emailResponse);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the whole request if email fails - invitation is still created
    }
    
    console.log('Invitation created:', {
      groupName: groupData?.name,
      inviterName,
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
