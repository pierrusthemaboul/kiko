-- ============================================================================
-- SYSTÈME DE RESET AUTOMATIQUE DES QUÊTES
-- ============================================================================
-- Ce script configure le reset automatique des quêtes daily/weekly/monthly
-- à exécuter dans l'éditeur SQL de Supabase (avec service_role)
-- ============================================================================

-- 1. Fonction pour nettoyer les quêtes expirées
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

-- 2. Activer l'extension pg_cron (si pas déjà fait)
-- ============================================================================
-- NOTE: pg_cron doit être activé par l'admin Supabase
-- Dashboard > Database > Extensions > pg_cron (Enable)

-- 3. Créer le cron job pour exécuter la fonction chaque jour à minuit (UTC)
-- ============================================================================
-- IMPORTANT: Exécuter ces commandes dans l'éditeur SQL de Supabase
-- avec les privilèges service_role

-- D'abord, supprimer le job s'il existe déjà
SELECT cron.unschedule('reset-daily-quests');

-- Créer le nouveau job : tous les jours à 00:00 UTC
SELECT cron.schedule(
  'reset-daily-quests',           -- Nom du job
  '0 0 * * *',                     -- Cron expression: chaque jour à minuit UTC
  $$SELECT public.reset_expired_quests();$$
);

-- 4. Tester la fonction manuellement
-- ============================================================================
-- Décommenter pour tester immédiatement:
-- SELECT * FROM public.reset_expired_quests();

-- 5. Vérifier que le cron job est bien créé
-- ============================================================================
SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests';

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
--
-- - Le cron job s'exécute à minuit UTC (= 1h du matin en hiver, 2h en été en France)
-- - Pour changer l'heure, modifier la cron expression:
--   '0 22 * * *' = 22h UTC = minuit heure française (hiver)
--   '0 23 * * *' = 23h UTC = minuit heure française (été)
--
-- - La fonction ne réinitialise QUE les quêtes des utilisateurs actifs
--   (ayant joué dans les 7 derniers jours) pour optimiser les performances
--
-- - Les quêtes weekly se réinitialisent le lundi à minuit
-- - Les quêtes monthly se réinitialisent le 1er du mois à minuit
--
-- - Pour voir les logs d'exécution:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-quests')
--   ORDER BY start_time DESC LIMIT 10;
--
-- ============================================================================
