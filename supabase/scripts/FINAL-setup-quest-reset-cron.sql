-- ============================================================================
-- SCRIPT FINAL CORRIGÉ - COPIER-COLLER DIRECTEMENT DANS SUPABASE
-- ============================================================================

BEGIN;

-- 1) Supprimer l'ancienne fonction bugguée
DROP FUNCTION IF EXISTS public.reset_expired_quests();

-- 2) Créer la fonction CORRECTE (sans ON CONFLICT)
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
        WHEN 'daily' THEN
          (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        WHEN 'weekly' THEN
          (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
        WHEN 'monthly' THEN
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
  INSERT INTO quest_progress (user_id, quest_key, current_value, completed, reset_at)
  SELECT user_id, quest_key, current_value, completed, reset_at
  FROM new_progress;

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_created_count;
END;
$$;

-- 3) Permissions
GRANT EXECUTE ON FUNCTION public.reset_expired_quests() TO postgres, service_role, authenticated;

-- 4) Supprimer l'ancien cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-quests') THEN
    PERFORM cron.unschedule('reset-daily-quests');
  END IF;
END$$;

-- 5) Créer le nouveau cron job
SELECT cron.schedule(
  'reset-daily-quests',
  '0 0 * * *',
  $$SELECT public.reset_expired_quests();$$
);

COMMIT;

-- 6) Test
SELECT * FROM public.reset_expired_quests();

-- 7) Vérifications
SELECT jobname, schedule, command, active FROM cron.job WHERE jobname = 'reset-daily-quests';
SELECT COUNT(*) as expired_quests FROM quest_progress WHERE reset_at < NOW();
