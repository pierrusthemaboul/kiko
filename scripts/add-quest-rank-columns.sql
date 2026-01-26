-- Script SQL pour ajouter les colonnes de scaling par grade
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les colonnes pour le système de scaling par grade
ALTER TABLE daily_quests
  ADD COLUMN IF NOT EXISTS min_rank_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_rank_index INTEGER DEFAULT 99;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN daily_quests.min_rank_index IS 'Index minimum du grade pour voir cette quête (0 = Page)';
COMMENT ON COLUMN daily_quests.max_rank_index IS 'Index maximum du grade pour voir cette quête (99 = tous)';

-- Créer un index pour optimiser les requêtes de sélection de quêtes
CREATE INDEX IF NOT EXISTS idx_daily_quests_rank_range
  ON daily_quests(is_active, quest_type, min_rank_index, max_rank_index);

-- Vérifier la structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'daily_quests'
  AND column_name IN ('min_rank_index', 'max_rank_index');
