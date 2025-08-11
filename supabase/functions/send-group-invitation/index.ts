import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  groupId: string;
  email: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Error response helper
function errorResponse(errorType: string, message: string, status: number) {
  console.error(`Error (${status}):`, { errorType, message });
  return new Response(
    JSON.stringify({ error: errorType, message }),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request body
    let requestData: InvitationRequest;
    try {
      requestData = await req.json();
    } catch {
      return errorResponse('invalid_request', 'Invalid JSON in request body', 400);
    }

    const { groupId, email } = requestData;

    // Validate input parameters
    if (!groupId || typeof groupId !== 'string' || groupId.trim() === '') {
      return errorResponse('missing_group_id', 'Group ID is required', 422);
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return errorResponse('missing_email', 'Email is required', 422);
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return errorResponse('invalid_email', 'Invalid email format', 422);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse('unauthorized', 'Authentication required', 401);
    }

    // Verify group exists and get group details
    const { data: group, error: groupError } = await supabaseClient
      .from('groups')
      .select('created_by, name, description')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return errorResponse('group_not_found', 'Group not found or access denied', 404);
    }

    // Check if user has permission to invite (is creator or admin of the group)
    const isCreator = group.created_by === user.id;
    let hasPermission = isCreator;

    if (!isCreator) {
      const { data: membership } = await supabaseClient
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();
      
      hasPermission = membership && (membership.role === 'admin' || membership.role === 'member');
    }

    if (!hasPermission) {
      return errorResponse('insufficient_permissions', 'You do not have permission to invite users to this group', 403);
    }

    // Prevent self-invitation
    if (normalizedEmail === user.email?.toLowerCase()) {
      return errorResponse('self_invitation', 'You cannot invite yourself to a group', 422);
    }

    // Check if invitation already exists for this email and group
    const { data: existingInvitation } = await supabaseClient
      .from('group_invitations')
      .select('id, status, expires_at')
      .eq('group_id', groupId)
      .eq('invitee_email', normalizedEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return errorResponse('invitation_pending', 'An invitation is already pending for this email', 409);
    }

    // Check if user with this email is already a member by checking existing users
    const { data: existingUser } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .single();

    if (existingUser) {
      // Check if this user is already a member
      const { data: existingMembership } = await supabaseClient
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMembership) {
        return errorResponse('already_member', 'This user is already a member of the group', 409);
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
        invitee_email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      
      // Handle specific database errors
      if (insertError.code === '23505') { // Unique constraint violation
        return errorResponse('invitation_pending', 'An invitation is already pending for this email', 409);
      }
      
      return errorResponse('server_error', 'Failed to create invitation due to database error', 500);
    }

    // Get inviter details for email
    const { data: inviterProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, pseudo')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.pseudo || 
                       `${inviterProfile?.first_name} ${inviterProfile?.last_name}`.trim() || 
                       'Unknown';

    // Send email notification if Resend API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailResponse = await resend.emails.send({
          from: 'Air Quality Monitor <onboarding@resend.dev>',
          to: [normalizedEmail],
          subject: `Invitation to join "${group.name}" group`,
          html: `
            <h1>You're invited to join a group!</h1>
            <p><strong>${inviterName}</strong> has invited you to join the <strong>"${group.name}"</strong> group in the Air Quality Monitor app.</p>
            ${group.description ? `<p><em>${group.description}</em></p>` : ''}
            
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
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email notification');
    }
    
    console.log('Invitation created successfully:', {
      groupName: group.name,
      inviterName,
      inviteeEmail: normalizedEmail,
      token,
      expiresAt: expiresAt.toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        invitation_token: token,
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error sending invitation:', error);
    return errorResponse('server_error', 'An unexpected error occurred', 500);
  }
});