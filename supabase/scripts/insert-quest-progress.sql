-- Script pour créer les quest_progress pour Pierre
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer les anciennes quest_progress
DELETE FROM quest_progress
WHERE user_id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

-- 2. Créer les quest_progress pour TOUTES les quêtes actives
INSERT INTO quest_progress (user_id, quest_key, current_value, completed, reset_at)
SELECT
  '9d97c5fe-9051-4da5-881a-f4f380cbb6b0' as user_id,
  quest_key,
  0 as current_value,
  false as completed,
  CASE
    -- Daily: demain à minuit
    WHEN quest_type = 'daily' THEN
      (CURRENT_DATE + INTERVAL '1 day')::timestamptz
    -- Weekly: lundi prochain à minuit
    WHEN quest_type = 'weekly' THEN
      (CURRENT_DATE + (8 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7 * INTERVAL '1 day')::timestamptz
    -- Monthly: 1er du mois prochain à minuit
    WHEN quest_type = 'monthly' THEN
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamptz
  END as reset_at
FROM daily_quests
WHERE is_active = true;

-- 3. Vérifier le résultat
SELECT
  quest_type,
  COUNT(*) as count
FROM quest_progress qp
JOIN daily_quests dq ON qp.quest_key = dq.quest_key
WHERE qp.user_id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'
GROUP BY quest_type
ORDER BY quest_type;

-- 4. Afficher les quêtes de score/champion créées
SELECT
  qp.quest_key,
  dq.title,
  dq.quest_type,
  dq.target_value,
  qp.current_value,
  qp.reset_at
FROM quest_progress qp
JOIN daily_quests dq ON qp.quest_key = dq.quest_key
WHERE qp.user_id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'
  AND (qp.quest_key LIKE '%score%' OR qp.quest_key LIKE '%champion%')
ORDER BY dq.quest_type, qp.quest_key;
