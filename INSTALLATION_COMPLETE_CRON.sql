-- ============================================================================
-- INSTALLATION COMPLÈTE DU SYSTÈME DE RESET AUTOMATIQUE DES QUÊTES
-- ============================================================================
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================================

-- ÉTAPE 1: Supprimer l'ancienne fonction si elle existe
-- ============================================================================
DROP FUNCTION IF EXISTS public.reset_expired_quests();

-- ÉTAPE 2: Créer la fonction de reset
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_expired_quests()
RETURNS TABLE(deleted_count INTEGER, created_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Supprimer toutes les quêtes dont la date de reset est dépassée
  DELETE FROM quest_progress
  WHERE reset_at < v_now;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Réinitialiser les quêtes pour tous les utilisateurs actifs
  -- On considère "actifs" = ayant joué dans les 7 derniers jours
  WITH active_users AS (
    SELECT DISTINCT user_id
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
        -- Daily: reset demain à minuit
        WHEN 'daily' THEN
          (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        -- Weekly: reset lundi prochain à minuit
        WHEN 'weekly' THEN
          (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
        -- Monthly: reset le 1er du mois prochain à minuit
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

-- ÉTAPE 3: Supprimer l'ancien cron job s'il existe
-- ============================================================================
SELECT cron.unschedule('reset-daily-quests');

-- ÉTAPE 4: Créer le nouveau cron job
-- ============================================================================
-- Exécution chaque jour à 00:00 UTC (= 1h du matin en France heure d'hiver)
SELECT cron.schedule(
  'reset-daily-quests',
  '0 0 * * *',
  $$SELECT public.reset_expired_quests();$$
);

-- ÉTAPE 5: Vérifier que tout est installé
-- ============================================================================

-- Vérifier que la fonction existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'reset_expired_quests';

-- Vérifier que le cron job existe
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'reset-daily-quests';

-- ============================================================================
-- RÉSULTAT ATTENDU:
-- ============================================================================
-- Vous devriez voir:
-- 1. Une ligne avec "reset_expired_quests" et "FUNCTION"
-- 2. Une ligne avec le cron job "reset-daily-quests" et active=true
-- ============================================================================
