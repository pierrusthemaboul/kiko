-- =====================================================
-- Script de correction du système de quêtes
-- =====================================================

-- 1. Créer la foreign key manquante entre quest_progress et daily_quests
-- Note: quest_key n'est pas la clé primaire de daily_quests, mais c'est une colonne unique
-- On doit d'abord s'assurer que quest_key est unique dans daily_quests

-- Vérifier si quest_key est unique dans daily_quests
-- (Cette requête ne fait que vérifier, elle ne modifie rien)
SELECT quest_key, COUNT(*) as count
FROM daily_quests
GROUP BY quest_key
HAVING COUNT(*) > 1;

-- Si la requête ci-dessus ne retourne rien, on peut ajouter la contrainte unique
ALTER TABLE daily_quests
ADD CONSTRAINT daily_quests_quest_key_unique UNIQUE (quest_key);

-- Maintenant on peut ajouter la foreign key
ALTER TABLE quest_progress
ADD CONSTRAINT quest_progress_quest_key_fkey
FOREIGN KEY (quest_key)
REFERENCES daily_quests(quest_key)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 2. Désactiver les quêtes du mode Précision
UPDATE daily_quests
SET is_active = false
WHERE quest_key IN ('t2_precision_perfect', 'weekly_precision_master');

-- 3. Vérification finale
SELECT
  'quest_progress' as table_name,
  COUNT(*) as total,
  COUNT(DISTINCT quest_key) as unique_quest_keys
FROM quest_progress
UNION ALL
SELECT
  'daily_quests' as table_name,
  COUNT(*) as total,
  COUNT(DISTINCT quest_key) as unique_quest_keys
FROM daily_quests;

-- Afficher les foreign keys de quest_progress
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'quest_progress';
