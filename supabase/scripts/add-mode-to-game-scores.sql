-- Migration: Ajouter la colonne 'mode' à la table game_scores
-- Date: 2025-10-06
-- Description: Ajouter une colonne pour différencier les modes de jeu (classic, precision) dans les classements

-- 1. Ajouter la colonne 'mode' avec une valeur par défaut 'classic'
-- Supporte 'classic', 'precision' et 'date' (ancien nom de precision)
ALTER TABLE public.game_scores
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'classic' CHECK (mode IN ('classic', 'precision', 'date'));

-- 2. Mettre à jour les scores existants pour avoir 'classic' comme mode
UPDATE public.game_scores
SET mode = 'classic'
WHERE mode IS NULL;

-- 3. Rendre la colonne NOT NULL après avoir mis à jour les valeurs existantes
ALTER TABLE public.game_scores
  ALTER COLUMN mode SET NOT NULL;

-- 4. Créer un index pour optimiser les requêtes de classement par mode
CREATE INDEX IF NOT EXISTS idx_game_scores_mode_created_at
  ON public.game_scores(mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_scores_mode_score
  ON public.game_scores(mode, score DESC);

-- Vérification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'game_scores' AND column_name = 'mode';
