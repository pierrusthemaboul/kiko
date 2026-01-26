-- Ajouter les nouvelles colonnes à la table daily_quests

-- Colonne pour la catégorie (volume, streak, score, skill, etc.)
ALTER TABLE daily_quests
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Colonne pour les récompenses en parties
ALTER TABLE daily_quests
ADD COLUMN IF NOT EXISTS parts_reward INTEGER DEFAULT 0;

-- Colonne pour la difficulté (1-4)
ALTER TABLE daily_quests
ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;

-- Commentaires
COMMENT ON COLUMN daily_quests.category IS 'Catégorie de la quête (volume, streak, score, skill, precision, variety, meta)';
COMMENT ON COLUMN daily_quests.parts_reward IS 'Nombre de parties bonus gagnées en récompense';
COMMENT ON COLUMN daily_quests.difficulty IS 'Difficulté de la quête (1=facile, 2=moyen, 3=difficile, 4=très difficile)';
