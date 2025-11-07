-- ============================================
-- Migration: Add group_id to missions table
-- ============================================

-- Étape 1: Ajouter la colonne group_id avec foreign key
ALTER TABLE public.missions
ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Étape 2: Créer les index pour performance
CREATE INDEX idx_missions_group_id ON public.missions(group_id);
CREATE INDEX idx_missions_group_shared ON public.missions(group_id, shared) 
WHERE shared = true AND group_id IS NOT NULL;

-- Étape 3: Supprimer l'ancienne policy trop large
DROP POLICY IF EXISTS "Users can view their own and group shared missions" ON public.missions;

-- Étape 4: Créer les nouvelles policies spécifiques
CREATE POLICY "Users can view their own missions"
ON public.missions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view missions shared with their groups"
ON public.missions FOR SELECT
USING (
  shared = true 
  AND group_id IS NOT NULL
  AND group_id IN (
    SELECT group_id 
    FROM public.group_memberships 
    WHERE user_id = auth.uid()
  )
);

-- Étape 5: Fonction de synchronisation automatique des statistiques de groupe
CREATE OR REPLACE FUNCTION sync_group_shared_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Uniquement si mission partagée avec un groupe
  IF NEW.shared = true AND NEW.group_id IS NOT NULL THEN
    
    INSERT INTO public.group_shared_statistics (
      group_id,
      user_id,
      date,
      avg_pm25,
      avg_pm10,
      avg_pm1,
      max_pm25,
      total_measurements,
      total_duration_minutes
    )
    VALUES (
      NEW.group_id,
      NEW.user_id,
      DATE(NEW.start_time),
      NEW.avg_pm25,
      NEW.avg_pm10,
      NEW.avg_pm1,
      NEW.max_pm25,
      NEW.measurements_count,
      NEW.duration_minutes
    )
    ON CONFLICT (group_id, user_id, date) 
    DO UPDATE SET
      -- Moyenne pondérée avec les stats existantes du même jour
      avg_pm25 = (
        (group_shared_statistics.avg_pm25 * group_shared_statistics.total_measurements) + 
        (EXCLUDED.avg_pm25 * EXCLUDED.total_measurements)
      ) / (group_shared_statistics.total_measurements + EXCLUDED.total_measurements),
      
      avg_pm10 = (
        (group_shared_statistics.avg_pm10 * group_shared_statistics.total_measurements) + 
        (EXCLUDED.avg_pm10 * EXCLUDED.total_measurements)
      ) / (group_shared_statistics.total_measurements + EXCLUDED.total_measurements),
      
      avg_pm1 = (
        (group_shared_statistics.avg_pm1 * group_shared_statistics.total_measurements) + 
        (EXCLUDED.avg_pm1 * EXCLUDED.total_measurements)
      ) / (group_shared_statistics.total_measurements + EXCLUDED.total_measurements),
      
      max_pm25 = GREATEST(group_shared_statistics.max_pm25, EXCLUDED.max_pm25),
      
      total_measurements = group_shared_statistics.total_measurements + EXCLUDED.total_measurements,
      total_duration_minutes = group_shared_statistics.total_duration_minutes + EXCLUDED.total_duration_minutes;
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Étape 6: Créer les triggers pour synchronisation automatique
CREATE TRIGGER trigger_sync_group_stats
AFTER INSERT ON public.missions
FOR EACH ROW
EXECUTE FUNCTION sync_group_shared_statistics();

CREATE TRIGGER trigger_sync_group_stats_update
AFTER UPDATE ON public.missions
FOR EACH ROW
WHEN (
  (OLD.shared = false AND NEW.shared = true AND NEW.group_id IS NOT NULL)
  OR
  (OLD.group_id IS DISTINCT FROM NEW.group_id AND NEW.shared = true AND NEW.group_id IS NOT NULL)
)
EXECUTE FUNCTION sync_group_shared_statistics();