import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleFitActivity {
  activityType: number;
  startTimeMillis: string;
  endTimeMillis: string;
  steps?: number;
  distance?: number;
  calories?: number;
}

// Map Google Fit activity types to human-readable names
const getActivityName = (activityType: number): string => {
  const activityMap: { [key: number]: string } = {
    7: 'Walking',
    8: 'Running', 
    1: 'Cycling',
    3: 'Stationary',
    9: 'In vehicle',
    0: 'Unknown'
  };
  return activityMap[activityType] || 'Unknown';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accessToken, startTime, endTime } = await req.json()
    
    if (!accessToken) {
      throw new Error('Access token is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Fetch activity data from Google Fit API
    const startTimeMs = startTime || (Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours
    const endTimeMs = endTime || Date.now()

    const fitResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startTimeMs).toISOString()}&endTime=${new Date(endTimeMs).toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!fitResponse.ok) {
      throw new Error(`Google Fit API error: ${await fitResponse.text()}`)
    }

    const fitData = await fitResponse.json()
    const activities: GoogleFitActivity[] = fitData.session || []

    // Process and store activities
    const processedActivities = []
    
    for (const activity of activities) {
      const startTime = new Date(parseInt(activity.startTimeMillis))
      const endTime = new Date(parseInt(activity.endTimeMillis))
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) // minutes

      const activityData = {
        user_id: user.id,
        activity_type: getActivityName(activity.activityType),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        steps: activity.steps || null,
        distance_meters: activity.distance || null,
        calories: activity.calories || null,
        source: 'google_fit',
        raw_data: activity
      }

      // Check if activity already exists
      const { data: existing } = await supabase
        .from('fitness_activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('start_time', startTime.toISOString())
        .eq('activity_type', getActivityName(activity.activityType))
        .single()

      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from('fitness_activities')
          .insert(activityData)
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting activity:', insertError)
        } else {
          processedActivities.push(inserted)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        activitiesProcessed: processedActivities.length,
        activities: processedActivities
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in google-fit-sync:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})