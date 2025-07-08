import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MissionData {
  name: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  avgPm1: number;
  avgPm25: number;
  avgPm10: number;
  maxPm25: number;
  measurementsCount: number;
  locationContext?: string;
  activityContext?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting analyze-air-quality function');
    const { missions, timeframe } = await req.json();
    console.log('Received data:', { 
      missionsCount: missions?.length, 
      timeframe,
      firstMission: missions?.[0]
    });

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    if (!missions || !Array.isArray(missions)) {
      console.error('Invalid missions data:', missions);
      throw new Error('Invalid missions data provided');
    }

    if (missions.length === 0) {
      console.log('No missions provided, returning empty state message');
      return new Response(JSON.stringify({ 
        analysis: `Aucune donnée disponible pour ${timeframe}. Effectuez des mesures pour obtenir une analyse personnalisée.`,
        dataPoints: {
          totalMissions: 0,
          totalExposureMinutes: 0,
          averagePM25: 0,
          maxPM25: 0,
          timeAboveWHO: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data summary for AI analysis
    const dataSummary = analyzeMissionsData(missions, timeframe);
    console.log('Data summary prepared:', dataSummary.substring(0, 200) + '...');
    
    const systemPrompt = `Tu es un expert en qualité de l'air et santé publique. Analyse les données d'exposition aux particules fines et fournis des insights personnalisés en français.

Seuils OMS (Organisation Mondiale de la Santé) :
- PM2.5 : 15 μg/m³ (moyenne annuelle), 45 μg/m³ (moyenne 24h)
- PM10 : 45 μg/m³ (moyenne annuelle), 90 μg/m³ (moyenne 24h)

Niveaux de qualité de l'air :
- Bon : PM2.5 ≤ 12 μg/m³
- Modéré : 12 < PM2.5 ≤ 35 μg/m³  
- Mauvais : 35 < PM2.5 ≤ 55 μg/m³
- Très mauvais : PM2.5 > 55 μg/m³

Fournis une analyse structurée avec :
1. Résumé de l'exposition
2. Temps passé au-dessus des seuils OMS
3. Patterns d'exposition (lieux, activités, moments)
4. Recommandations personnalisées
5. Impact santé potentiel

Sois précis, bienveillant et actionnable dans tes recommandations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyse ces données d'exposition aux particules fines sur ${timeframe} :\n\n${dataSummary}` }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Calculate valid missions for data points
    const validMissions = missions.filter(m => m.avgPm25 != null && !isNaN(m.avgPm25));
    
    return new Response(JSON.stringify({ 
      analysis,
      dataPoints: {
        totalMissions: missions.length,
        totalExposureMinutes: missions.reduce((sum: number, m: MissionData) => sum + (m.durationMinutes || 0), 0),
        averagePM25: validMissions.length > 0 ? validMissions.reduce((sum: number, m: MissionData) => sum + m.avgPm25, 0) / validMissions.length : 0,
        maxPM25: validMissions.length > 0 ? Math.max(...validMissions.map((m: MissionData) => m.maxPm25 || 0)) : 0,
        timeAboveWHO: calculateTimeAboveWHO(missions)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-air-quality function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: "Erreur lors de l'analyse des données. Veuillez réessayer."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeMissionsData(missions: MissionData[], timeframe: string): string {
  if (missions.length === 0) {
    return `Aucune donnée disponible pour ${timeframe}.`;
  }

  const totalExposure = missions.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
  const validMissions = missions.filter(m => m.avgPm25 != null && !isNaN(m.avgPm25));
  const avgPM25 = validMissions.length > 0 ? validMissions.reduce((sum, m) => sum + m.avgPm25, 0) / validMissions.length : 0;
  const maxPM25 = validMissions.length > 0 ? Math.max(...validMissions.map(m => m.maxPm25 || 0)) : 0;
  const timeAboveWHO = calculateTimeAboveWHO(missions);

  // Group by location and activity
  const locationStats = groupByContext(missions, 'locationContext');
  const activityStats = groupByContext(missions, 'activityContext');

  return `DONNÉES D'EXPOSITION - ${timeframe.toUpperCase()}

📊 RÉSUMÉ GÉNÉRAL:
- Nombre de missions: ${missions.length}
- Temps d'exposition total: ${Math.round(totalExposure)} minutes (${(totalExposure/60).toFixed(1)} heures)
- PM2.5 moyen: ${avgPm25.toFixed(1)} μg/m³
- PM2.5 maximum: ${maxPM25.toFixed(1)} μg/m³
- Temps au-dessus seuil OMS (15 μg/m³): ${timeAboveWHO.toFixed(0)} minutes

🏢 EXPOSITION PAR LIEU:
${locationStats}

🚶 EXPOSITION PAR ACTIVITÉ:
${activityStats}

📈 DÉTAIL DES MISSIONS:
${missions.slice(0, 5).map(m => 
  `- ${m.name}: ${m.avgPm25.toFixed(1)} μg/m³ pendant ${m.durationMinutes}min ${m.locationContext ? `(${m.locationContext})` : ''}`
).join('\n')}${missions.length > 5 ? `\n... et ${missions.length - 5} autres missions` : ''}`;
}

function calculateTimeAboveWHO(missions: MissionData[]): number {
  return missions.reduce((total, mission) => {
    if (mission.avgPm25 != null && !isNaN(mission.avgPm25) && mission.avgPm25 > 15) { // WHO threshold for PM2.5
      return total + (mission.durationMinutes || 0);
    }
    return total;
  }, 0);
}

function groupByContext(missions: MissionData[], contextType: 'locationContext' | 'activityContext'): string {
  const grouped = missions.reduce((acc, mission) => {
    const context = mission[contextType] || 'Non spécifié';
    if (!acc[context]) {
      acc[context] = { missions: 0, totalTime: 0, totalPM25: 0 };
    }
    acc[context].missions++;
    acc[context].totalTime += (mission.durationMinutes || 0);
    acc[context].totalPM25 += (mission.avgPm25 || 0);
    return acc;
  }, {} as Record<string, { missions: number; totalTime: number; totalPM25: number }>);

  return Object.entries(grouped)
    .sort(([,a], [,b]) => b.totalTime - a.totalTime)
    .slice(0, 3)
    .map(([context, stats]) => 
      `  ${context}: ${(stats.totalPM25/stats.missions).toFixed(1)} μg/m³ (${stats.totalTime}min, ${stats.missions} missions)`
    ).join('\n') || '  Aucune donnée contextualisée';
}