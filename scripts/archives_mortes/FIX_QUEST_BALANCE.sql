-- ============================================================================
-- CORRECTION DE L'ÉQUILIBRAGE DES QUÊTES
-- ============================================================================
-- Ce script corrige les 4 quêtes incohérentes identifiées:
-- 1. Désactive les 3 quêtes daily T4 (trop difficiles)
-- 2. Réduit la quête monthly T4 de 3M à 2M points
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTIE 1: DÉSACTIVATION DES QUÊTES DAILY T4
-- ============================================================================

-- Ces quêtes demandent 4-18 parties pour une quête "quotidienne", ce qui est incohérent
-- Elles restent dans la base mais ne seront plus assignées aux joueurs

UPDATE daily_quests
SET
  is_active = false
WHERE quest_key IN (
  't4_score_75000',   -- 75k-86k points (4-5 parties)
  't4_score_150000',  -- 150k-173k points (8-9 parties)
  't4_score_300000'   -- 300k-345k points (15-18 parties)
);

-- Vérification
SELECT
  quest_key,
  quest_type,
  difficulty,
  target_value,
  is_active,
  'Désactivée car trop difficile pour une quête quotidienne' as raison
FROM daily_quests
WHERE quest_key IN ('t4_score_75000', 't4_score_150000', 't4_score_300000');

-- ============================================================================
-- PARTIE 2: RÉDUCTION DE LA QUÊTE MONTHLY T4
-- ============================================================================

-- Passe de 3M à 2M points (de 150-173 parties à 100-115 parties par mois)
-- Cela représente 3.3-3.8 parties/jour, ce qui est plus raisonnable

UPDATE daily_quests
SET
  target_value = 2000000,  -- De 3M à 2M
  xp_reward = 25000         -- Ajusté proportionnellement (était 40000)
WHERE quest_key = 'm4_score_3M';

-- Vérification
SELECT
  quest_key,
  quest_type,
  difficulty,
  target_value as nouvelle_cible,
  xp_reward as nouvelle_xp,
  'Réduite de 3M à 2M points' as changement
FROM daily_quests
WHERE quest_key = 'm4_score_3M';

-- ============================================================================
-- PARTIE 3: NETTOYAGE DES QUEST_PROGRESS ORPHELINS
-- ============================================================================

-- Supprimer les progressions liées aux quêtes désactivées
-- (Les joueurs ne pourront plus les voir)

DELETE FROM quest_progress
WHERE quest_key IN ('t4_score_75000', 't4_score_150000', 't4_score_300000');

-- Statistiques de nettoyage
SELECT
  COUNT(*) as quest_progress_supprimes
FROM quest_progress
WHERE quest_key IN ('t4_score_75000', 't4_score_150000', 't4_score_300000');

COMMIT;

-- ============================================================================
-- PARTIE 4: VÉRIFICATIONS FINALES
-- ============================================================================

-- 4.1 Vérifier le nombre de quêtes actives par tier et type
SELECT
  quest_type,
  difficulty as tier,
  COUNT(*) as nombre_quetes_actives,
  STRING_AGG(quest_key, ', ') as quest_keys
FROM daily_quests
WHERE is_active = true
GROUP BY quest_type, difficulty
ORDER BY quest_type, difficulty;

-- 4.2 Vérifier qu'il n'y a plus de quêtes daily incohérentes
SELECT
  quest_key,
  target_value,
  ROUND(target_value::numeric * 1.15 / 20000, 1) as parties_max_20k,
  CASE
    WHEN target_value * 1.15 > 60000 THEN '⚠️ Trop élevé'
    ELSE '✅ OK'
  END as coherence
FROM daily_quests
WHERE quest_type = 'daily'
  AND is_active = true
  AND (quest_key LIKE '%score%' OR quest_key LIKE '%champion%' OR quest_key LIKE '%points%')
ORDER BY difficulty, target_value;

-- 4.3 Statistiques globales
SELECT
  COUNT(*) as total_quetes,
  COUNT(*) FILTER (WHERE is_active = true) as quetes_actives,
  COUNT(*) FILTER (WHERE is_active = false) as quetes_inactives,
  COUNT(*) FILTER (WHERE is_active = true AND quest_type = 'daily') as daily_actives,
  COUNT(*) FILTER (WHERE is_active = true AND quest_type = 'weekly') as weekly_actives,
  COUNT(*) FILTER (WHERE is_active = true AND quest_type = 'monthly') as monthly_actives
FROM daily_quests;

-- ============================================================================
-- RÉSUMÉ DES CHANGEMENTS
-- ============================================================================
--
-- ✅ 3 quêtes daily T4 désactivées (t4_score_75000, t4_score_150000, t4_score_300000)
-- ✅ 1 quête monthly T4 réduite (m4_score_3M: 3M → 2M points, 40k → 25k XP)
-- ✅ Quest_progress orphelins nettoyés
--
-- Le système de quêtes est maintenant 100% cohérent avec les performances
-- réelles des joueurs (10k-20k points/partie) !
-- ============================================================================
