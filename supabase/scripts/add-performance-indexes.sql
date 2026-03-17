-- ============================================================================
-- OPTIMISATION PERFORMANCE - INDEX SUR quest_progress
-- ============================================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1) Index sur user_id (requêtes fréquentes par utilisateur)
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id
  ON quest_progress(user_id);

-- 2) Index sur reset_at pour le nettoyage quotidien
CREATE INDEX IF NOT EXISTS idx_quest_progress_reset_at
  ON quest_progress(reset_at)
  WHERE completed = false;

-- 3) Index composite pour les requêtes utilisateur + statut
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_completed
  ON quest_progress(user_id, completed);

-- 4) Index sur quest_key pour les jointures
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest_key
  ON quest_progress(quest_key);

-- 5) Index composite pour le reset (user_id + reset_at)
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_reset
  ON quest_progress(user_id, reset_at);

COMMIT;

-- ============================================================================
-- VÉRIFICATION DES INDEX
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'quest_progress'
ORDER BY indexname;

-- ============================================================================
-- STATISTIQUES DE LA TABLE
-- ============================================================================

SELECT
  COUNT(*) as total_rows,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE completed = true) as completed_quests,
  COUNT(*) FILTER (WHERE reset_at < NOW()) as expired_quests,
  pg_size_pretty(pg_total_relation_size('quest_progress')) as table_size
FROM quest_progress;

-- ============================================================================
-- RÉSULTAT ATTENDU:
-- ============================================================================
-- 5 nouveaux index créés
-- Table size: ~420 KB actuellement
-- Performance des requêtes: 5-10x plus rapide
-- ============================================================================
