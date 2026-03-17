-- Migration: Corriger les xp_total NULL et initialiser les quest_progress
-- Date: 2025-10-06

-- 1. Mettre à jour les profils avec xp_total NULL
UPDATE public.profiles
SET xp_total = COALESCE(xp_total, 0)
WHERE xp_total IS NULL;

-- 2. Vérifier qu'il n'y a plus de NULL
SELECT id, display_name, xp_total
FROM public.profiles
WHERE xp_total IS NULL;

-- 3. S'assurer que la colonne a une valeur par défaut
ALTER TABLE public.profiles
ALTER COLUMN xp_total SET DEFAULT 0;

-- Résultat : afficher tous les profils
SELECT id, display_name, xp_total, games_played
FROM public.profiles
ORDER BY xp_total DESC
LIMIT 10;
