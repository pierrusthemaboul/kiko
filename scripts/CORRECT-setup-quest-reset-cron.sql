-- ============================================================================
-- SCRIPT CORRECT POUR TA STRUCTURE DE BASE DE DONNÉES
-- ============================================================================
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================================

BEGIN;

-- 1) Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.reset_expired_quests();

-- 2) Créer la BONNE fonction adaptée à ta structure
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
  -- (ayant joué dans les 7 derniers jours)
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
      CASE aq.quest_type
        -- Daily: reset demain à minuit UTC
        WHEN 'daily' THEN
          (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        -- Weekly: reset lundi prochain à minuit UTC
        WHEN 'weekly' THEN
          (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
        -- Monthly: reset le 1er du mois prochain à minuit UTC
        WHEN 'monthly' THEN
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp with time zone
      END as reset_at
    FROM active_users au
    CROSS JOIN active_quests aq
  )
  INSERT INTO quest_progress (user_id, quest_key, current_value, completed, reset_at)
  SELECT user_id, quest_key, current_value, completed, reset_at
  FROM new_progress
  ON CONFLICT (user_id, quest_key) DO NOTHING;

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_created_count;
END;
$$;

-- 3) Donner les permissions
GRANT EXECUTE ON FUNCTION public.reset_expired_quests() TO postgres, service_role, authenticated;

-- 4) Supprimer le cron job s'il existe déjà
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-quests') THEN
    PERFORM cron.unschedule('reset-daily-quests');
  END IF;
END$$;

-- 5) Créer le cron job pour exécution quotidienne à minuit UTC
SELECT cron.schedule(
  'reset-daily-quests',
  '0 0 * * *',  -- Chaque jour à minuit UTC
  $$SELECT public.reset_expired_quests();$$
);

COMMIT;

-- 6) Test immédiat de la fonction
SELECT * FROM public.reset_expired_quests();

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================

-- Vérifier que le cron job est créé
SELECT
  jobname,
  schedule,
  command,
  active,
  jobid
FROM cron.job
WHERE jobname = 'reset-daily-quests';

-- Vérifier qu'il n'y a pas de quêtes expirées
SELECT COUNT(*) as expired_quests
FROM quest_progress
WHERE reset_at < NOW();

-- ============================================================================
-- RÉSULTAT ATTENDU:
-- ============================================================================
-- Test de la fonction: (deleted_count: 0, created_count: 0) si aucune quête expirée
-- Cron job: 1 ligne avec jobname='reset-daily-quests', schedule='0 0 * * *'
-- Quêtes expirées: 0
-- ============================================================================
