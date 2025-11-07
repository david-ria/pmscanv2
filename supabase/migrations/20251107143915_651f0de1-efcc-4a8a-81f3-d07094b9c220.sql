-- ============================================
-- PHASE 2: OPTIMISATION DU STORAGE
-- Cleanup automatique de location_enrichment_data
-- ============================================

-- =====================
-- 1. FONCTION DE CLEANUP AUTOMATIQUE
-- =====================

-- Supprime les données d'enrichissement de localisation anciennes et non utilisées
CREATE OR REPLACE FUNCTION public.cleanup_old_location_enrichment()
RETURNS TABLE(deleted_count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  -- Supprimer les données de plus de 90 jours
  -- ET qui ne sont pas référencées dans les measurements récents (30 derniers jours)
  DELETE FROM public.location_enrichment_data
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.measurements m
    WHERE m.created_at > NOW() - INTERVAL '30 days'
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    -- Match approximatif sur lat/lon (précision ~100m)
    AND ABS(m.latitude - location_enrichment_data.latitude) < 0.001
    AND ABS(m.longitude - location_enrichment_data.longitude) < 0.001
  );
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  -- Log le résultat
  RAISE NOTICE 'Cleaned up % old location enrichment records', rows_deleted;
  
  RETURN QUERY SELECT rows_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_location_enrichment() IS 
'Nettoie les données d''enrichissement de localisation anciennes (>90j) et non utilisées. Appelée périodiquement pour optimiser le stockage.';

-- =====================
-- 2. FONCTION DE CLEANUP AGRESSIF (URGENCE)
-- =====================

-- Version agressive pour libérer beaucoup d'espace rapidement
CREATE OR REPLACE FUNCTION public.cleanup_location_enrichment_aggressive()
RETURNS TABLE(deleted_count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted bigint;
BEGIN
  -- Supprimer toutes les données de plus de 30 jours
  DELETE FROM public.location_enrichment_data
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  RAISE NOTICE 'Aggressively cleaned up % location enrichment records', rows_deleted;
  
  RETURN QUERY SELECT rows_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_location_enrichment_aggressive() IS 
'Cleanup agressif: supprime toutes les données d''enrichissement de plus de 30 jours. À utiliser en cas de saturation du stockage.';

-- =====================
-- 3. INDEX POUR OPTIMISER LES CLEANUP
-- =====================

-- Index sur created_at pour accélérer les requêtes de cleanup
CREATE INDEX IF NOT EXISTS idx_location_enrichment_created_at 
ON public.location_enrichment_data(created_at);

-- Index spatial pour les recherches par proximité
CREATE INDEX IF NOT EXISTS idx_location_enrichment_coords 
ON public.location_enrichment_data(latitude, longitude);

-- =====================
-- 4. STATISTIQUES DE LA TABLE
-- =====================

-- Fonction pour obtenir des statistiques sur l'enrichissement de localisation
CREATE OR REPLACE FUNCTION public.get_location_enrichment_stats()
RETURNS TABLE(
  total_records bigint,
  oldest_record timestamp with time zone,
  newest_record timestamp with time zone,
  records_over_90_days bigint,
  records_over_30_days bigint,
  estimated_size_mb numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '90 days')::bigint as records_over_90_days,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days')::bigint as records_over_30_days,
    ROUND((pg_total_relation_size('public.location_enrichment_data')::numeric / 1024 / 1024), 2) as estimated_size_mb
  FROM public.location_enrichment_data;
END;
$$;

COMMENT ON FUNCTION public.get_location_enrichment_stats() IS 
'Fournit des statistiques sur la table location_enrichment_data pour monitoring';

-- =====================
-- 5. PERMISSIONS
-- =====================

-- Permettre aux utilisateurs authentifiés d'appeler les fonctions de cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_old_location_enrichment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_location_enrichment_stats() TO authenticated;

-- Seuls les admins peuvent utiliser le cleanup agressif
GRANT EXECUTE ON FUNCTION public.cleanup_location_enrichment_aggressive() TO authenticated;