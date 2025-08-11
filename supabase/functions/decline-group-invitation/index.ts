import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  'https://lovable.dev',
  'http://localhost:8080',
  'http://localhost:5173'
]);

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

interface DeclineInvitationRequest {
  token: string;
}

// Error response helper
function errorResponse(errorType: string, message: string, status: number, req: Request) {
  console.error(`Error (${status}):`, { errorType, message });
  return new Response(
    JSON.stringify({ error: errorType, message }),
    { 
      status,
      headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' }
    }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  try {
    // Validate request body
    let requestData: DeclineInvitationRequest;
    try {
      requestData = await req.json();
    } catch {
      return errorResponse('invalid_request', 'Invalid JSON in request body', 400, req);
    }

    const { token } = requestData;
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return errorResponse('missing_token', 'Token is required', 422, req);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse('unauthorized', 'Authentication required', 401, req);
    }

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('group_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      // Check if invitation exists but is not pending
      const { data: existingInvitation } = await supabaseClient
        .from('group_invitations')
        .select('status, expires_at')
        .eq('token', token)
        .single();

      if (existingInvitation) {
        if (existingInvitation.status !== 'pending') {
          return errorResponse('invitation_already_processed', 'This invitation has already been processed', 409, req);
        }
        if (new Date(existingInvitation.expires_at) <= new Date()) {
          return errorResponse('invitation_expired', 'This invitation has expired', 422, req);
        }
      }
      
      return errorResponse('invalid_token', 'Invalid invitation token', 422, req);
    }

    // Verify the invitation is for the current user's email
    if (invitation.invitee_email !== user.email) {
      return errorResponse('email_mismatch', 'This invitation is not for your email address', 403, req);
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) <= new Date()) {
      return errorResponse('invitation_expired', 'This invitation has expired', 422, req);
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
      
      // Check for specific database errors
      if (updateError.code === '23505') { // Unique constraint violation or race condition
        return errorResponse('invitation_already_processed', 'This invitation has already been processed', 409, req);
      }
      
      return errorResponse('server_error', 'Failed to decline invitation due to database error', 500, req);
    }

    console.log('Invitation declined successfully:', {
      invitationId: invitation.id,
      groupId: invitation.group_id,
      userId: user.id,
      userEmail: user.email
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation declined successfully' 
      }),
      { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error declining invitation:', error);
    return errorResponse('server_error', 'An unexpected error occurred', 500, req);
  }
});