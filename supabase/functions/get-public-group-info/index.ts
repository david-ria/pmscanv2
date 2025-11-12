import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const RequestSchema = z.object({
  groupId: z.string().uuid({ message: "Invalid group ID format" }),
  token: z.string().optional(),
});

interface MinimalGroupInfo {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

serve(async (req) => {
  console.log('get-public-group-info function called:', { method: req.method, url: req.url });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedInput = RequestSchema.parse(body);
    const { groupId, token } = validatedInput;
    
    console.log('Fetching public info for group:', groupId, 'with token:', !!token);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If token is provided, validate it
    if (token) {
      console.log('Validating token...');
      const { data: invitation, error: inviteError } = await supabase
        .from('group_invitations')
        .select('group_id, expires_at, status')
        .eq('token', token)
        .single();

      if (inviteError || !invitation) {
        console.error('Invalid or expired token:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired invitation token' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if token is expired
      if (new Date(invitation.expires_at) < new Date()) {
        console.error('Token has expired');
        return new Response(
          JSON.stringify({ error: 'Invitation token has expired' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Verify the token's group_id matches the requested groupId
      if (invitation.group_id !== groupId) {
        console.error('Token group_id mismatch:', { tokenGroupId: invitation.group_id, requestedGroupId: groupId });
        return new Response(
          JSON.stringify({ error: 'Token does not match the requested group' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Token validated successfully');
    }

    // Fetch ONLY minimal group info (no sensitive data)
    const { data: groupInfo, error: groupError } = await supabase
      .from('groups')
      .select('id, name, description, logo_url')
      .eq('id', groupId)
      .single();

    if (groupError || !groupInfo) {
      console.error('Group not found:', groupError);
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const minimalInfo: MinimalGroupInfo = {
      id: groupInfo.id,
      name: groupInfo.name,
      description: groupInfo.description,
      logo_url: groupInfo.logo_url,
    };

    console.log('Successfully returning minimal group info');
    return new Response(
      JSON.stringify(minimalInfo),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-public-group-info:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: error.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to fetch group information' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
