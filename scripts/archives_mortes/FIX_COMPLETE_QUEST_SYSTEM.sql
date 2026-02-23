-- ============================================================================
-- CORRECTION COMPLÈTE DU SYSTÈME DE QUÊTES
-- ============================================================================
-- Ce script corrige TOUS les problèmes identifiés:
-- 1. Ajoute la colonne 'claimed' manquante
-- 2. Corrige la fonction reset_expired_quests()
-- 3. Installe le cron job pour le reset automatique
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTIE 1: CORRECTION DU SCHÉMA
-- ============================================================================

-- 1.1 Ajouter la colonne 'claimed' à quest_progress
ALTER TABLE quest_progress
ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;

-- 1.2 Mettre à jour les valeurs existantes
UPDATE quest_progress
SET claimed = false
WHERE claimed IS NULL;

-- 1.3 Ajouter une contrainte NOT NULL (après avoir mis à jour)
ALTER TABLE quest_progress
ALTER COLUMN claimed SET NOT NULL;

-- Vérification
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'quest_progress'
  AND column_name = 'claimed';

-- ============================================================================
-- PARTIE 2: CORRECTION DE LA FONCTION DE RESET
-- ============================================================================

-- 2.1 Supprimer l'ancienne fonction bugguée
DROP FUNCTION IF EXISTS public.reset_expired_quests();

-- 2.2 Créer la fonction CORRECTE
CREATE OR REPLACE FUNCTION public.reset_expired_quests()
RETURNS TABLE(deleted_count BIGINT, created_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT := 0;
  v_created_count BIGINT := 0;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Étape 1: Supprimer toutes les quêtes expirées
  DELETE FROM quest_progress
  WHERE reset_at < v_now;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Étape 2: Réinitialiser les quêtes pour tous les utilisateurs actifs
  -- (Utilisateurs qui ont joué dans les 7 derniers jours)
  WITH active_users AS (
    SELECT DISTINCT id as user_id
    FROM profiles
    WHERE last_play_date >= (CURRENT_DATE - INTERVAL '7 days')
  ),
  active_quests AS (
    SELECT quest_key, quest_type
    FROM daily_quests
    WHERE is_active = true
  ),
  new_progress AS (
    SELECT
      au.user_id,
      aq.quest_key,
      0 as current_value,
      false as completed,
      false as claimed,
      CASE aq.quest_type
        WHEN 'daily' THEN
          (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        WHEN 'weekly' THEN
          -- Prochain lundi
          (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
        WHEN 'monthly' THEN
          -- 1er du mois prochain
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp with time zone
      END as reset_at
    FROM active_users au
    CROSS JOIN active_quests aq
    WHERE NOT EXISTS (
      SELECT 1 FROM quest_progress qp
      WHERE qp.user_id = au.user_id
      AND qp.quest_key = aq.quest_key
    )
  )
  INSERT INTO quest_progress (user_id, quest_key, current_value, completed, claimed, reset_at)
  SELECT user_id, quest_key, current_value, completed, claimed, reset_at
  FROM new_progress;

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_created_count;
END;
$$;

-- 2.3 Permissions
GRANT EXECUTE ON FUNCTION public.reset_expired_quests() TO postgres, service_role, authenticated;

-- ============================================================================
-- PARTIE 3: CONFIGURATION DU CRON JOB
-- ============================================================================

-- 3.1 Supprimer l'ancien cron job s'il existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-quests') THEN
    PERFORM cron.unschedule('reset-daily-quests');
  END IF;
END$$;

-- 3.2 Créer le nouveau cron job
-- Exécution à minuit UTC chaque jour (1h-2h du matin en France)
SELECT cron.schedule(
  'reset-daily-quests',
  '0 0 * * *',
  $$SELECT public.reset_expired_quests();$$
);

COMMIT;

-- ============================================================================
-- PARTIE 4: TESTS ET VÉRIFICATIONS
-- ============================================================================

-- 4.1 Test de la fonction
SELECT * FROM public.reset_expired_quests();

-- 4.2 Vérifier le cron job
SELECT
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport,
  database,
  username
FROM cron.job
WHERE jobname = 'reset-daily-quests';

-- 4.3 Vérifier qu'il n'y a pas de quêtes expirées
SELECT COUNT(*) as expired_quests
FROM quest_progress
WHERE reset_at < NOW();

-- 4.4 Vérifier les quêtes avec claimed = true
SELECT COUNT(*) as claimed_quests
FROM quest_progress
WHERE claimed = true;

-- 4.5 Statistiques globales
SELECT
  COUNT(*) as total_quests,
  COUNT(*) FILTER (WHERE completed = true) as completed_quests,
  COUNT(*) FILTER (WHERE claimed = true) as claimed_quests,
  COUNT(*) FILTER (WHERE completed = true AND claimed = false) as ready_to_claim
FROM quest_progress;

-- ============================================================================
-- RÉSUMÉ DES CHANGEMENTS
-- ============================================================================
--
-- ✅ Colonne 'claimed' ajoutée à quest_progress
-- ✅ Fonction reset_expired_quests() corrigée
-- ✅ Cron job installé pour reset automatique à minuit UTC
--
-- Le système de quêtes est maintenant COMPLET et FONCTIONNEL !
-- ============================================================================
