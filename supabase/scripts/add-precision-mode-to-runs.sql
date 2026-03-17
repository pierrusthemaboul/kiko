-- Migration: Ajouter 'precision' comme mode valide dans la table runs
-- Date: 2025-10-06

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.runs DROP CONSTRAINT IF EXISTS runs_mode_check;

-- 2. Ajouter la nouvelle contrainte avec 'precision' inclus
ALTER TABLE public.runs
  ADD CONSTRAINT runs_mode_check
  CHECK (mode IN ('classic', 'date', 'precision'));

-- Vérification
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'runs_mode_check';
