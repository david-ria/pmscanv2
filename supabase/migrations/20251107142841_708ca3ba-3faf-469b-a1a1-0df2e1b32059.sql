-- ============================================
-- PHASE 1: CORRECTIONS DE SÉCURITÉ CRITIQUES
-- ============================================

-- =====================
-- 1. CORRIGER RLS SUR EVENTS
-- =====================

-- Supprimer la policy actuelle trop permissive
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;

-- Créer une policy stricte: uniquement les événements de SES missions
CREATE POLICY "Users can view only their mission events"
ON public.events
FOR SELECT
USING (
  mission_id IN (
    SELECT id FROM public.missions 
    WHERE user_id = auth.uid()
  )
);

-- Garder les autres policies existantes (INSERT, UPDATE, DELETE sont OK)

-- =====================
-- 2. CORRIGER RLS SUR WEATHER_DATA
-- =====================

-- Supprimer la policy publique actuelle
DROP POLICY IF EXISTS "Anyone can view weather data" ON public.weather_data;

-- Créer une policy restreinte: uniquement les données météo liées aux missions de l'utilisateur
CREATE POLICY "Users can view weather data for their missions"
ON public.weather_data
FOR SELECT
USING (
  id IN (
    SELECT weather_data_id 
    FROM public.missions 
    WHERE user_id = auth.uid()
    AND weather_data_id IS NOT NULL
  )
);

-- Permettre aussi la lecture pour les utilisateurs voyant des missions partagées dans leurs groupes
CREATE POLICY "Users can view weather data for shared group missions"
ON public.weather_data
FOR SELECT
USING (
  id IN (
    SELECT weather_data_id 
    FROM public.missions 
    WHERE weather_data_id IS NOT NULL
    AND shared = true
    AND user_id IN (
      SELECT gm1.user_id
      FROM public.group_memberships gm1
      WHERE gm1.group_id IN (
        SELECT gm2.group_id
        FROM public.group_memberships gm2
        WHERE gm2.user_id = auth.uid()
      )
    )
  )
);

-- =====================
-- 3. AJOUTER INDEX POUR PERFORMANCE
-- =====================

-- Index pour accélérer les vérifications RLS
CREATE INDEX IF NOT EXISTS idx_missions_weather_data_id 
ON public.missions(weather_data_id) 
WHERE weather_data_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_mission_id 
ON public.events(mission_id);

-- =====================
-- 4. COMMENTAIRES DE SÉCURITÉ
-- =====================

COMMENT ON POLICY "Users can view only their mission events" ON public.events IS 
'Sécurité critique: Les utilisateurs ne peuvent voir que les événements de leurs propres missions';

COMMENT ON POLICY "Users can view weather data for their missions" ON public.weather_data IS 
'Sécurité critique: Les données météo sont privées et liées aux missions utilisateur';

COMMENT ON POLICY "Users can view weather data for shared group missions" ON public.weather_data IS 
'Permet l''accès aux données météo des missions partagées dans les groupes';
