-- Migration complète: Activer le mode Précision dans l'économie du jeu
-- Date: 2025-10-06
-- Description: Ajoute 'precision' comme mode valide, corrige xp_total NULL,
--              et initialise les quest_progress pour tous les utilisateurs

-- ========================================
-- 1. AJOUTER 'precision' COMME MODE VALIDE
-- ========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE public.runs DROP CONSTRAINT IF EXISTS runs_mode_check;

-- Ajouter la nouvelle contrainte avec 'precision' inclus
ALTER TABLE public.runs
  ADD CONSTRAINT runs_mode_check
  CHECK (mode IN ('classic', 'date', 'precision'));

SELECT 'Step 1: ✅ Contrainte runs_mode_check mise à jour' AS status;

-- ========================================
-- 2. CORRIGER LES xp_total NULL
-- ========================================

-- Mettre à jour les profils avec xp_total NULL
UPDATE public.profiles
SET xp_total = COALESCE(xp_total, 0)
WHERE xp_total IS NULL;

-- S'assurer que la colonne a une valeur par défaut
ALTER TABLE public.profiles
ALTER COLUMN xp_total SET DEFAULT 0;

SELECT 'Step 2: ✅ xp_total NULL corrigés et DEFAULT ajouté' AS status;

-- Vérifier qu'il n'y a plus de NULL
SELECT
  'Step 2 Verification: ' || COUNT(*) || ' profils avec xp_total NULL' AS status
FROM public.profiles
WHERE xp_total IS NULL;

-- ========================================
-- 3. INITIALISER quest_progress POUR TOUS
-- ========================================

-- Fonction helper pour calculer reset_at selon le type de quête
CREATE OR REPLACE FUNCTION get_quest_reset_date(quest_type TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  reset_date TIMESTAMPTZ;
BEGIN
  IF quest_type = 'daily' THEN
    -- Reset demain à minuit
    reset_date := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  ELSIF quest_type = 'weekly' THEN
    -- Reset lundi prochain à minuit
    reset_date := (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week')::TIMESTAMPTZ;
  ELSE -- monthly
    -- Reset le 1er du mois prochain à minuit
    reset_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMPTZ;
  END IF;

  RETURN reset_date;
END;
$$ LANGUAGE plpgsql;

SELECT 'Step 3a: ✅ Fonction get_quest_reset_date créée' AS status;

-- Insérer quest_progress pour tous les users qui n'en ont pas
INSERT INTO public.quest_progress (user_id, quest_key, current_value, completed, reset_at)
SELECT
  p.id AS user_id,
  dq.quest_key,
  0 AS current_value,
  false AS completed,
  get_quest_reset_date(dq.quest_type) AS reset_at
FROM
  public.profiles p
CROSS JOIN
  public.daily_quests dq
WHERE
  dq.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.quest_progress qp
    WHERE qp.user_id = p.id
    AND qp.quest_key = dq.quest_key
  );

SELECT 'Step 3b: ✅ quest_progress initialisés pour tous les utilisateurs' AS status;

-- Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS get_quest_reset_date(TEXT);

-- ========================================
-- 4. VÉRIFICATIONS FINALES
-- ========================================

-- Vérifier les contraintes runs
SELECT
  'Runs mode constraint: ' || check_clause AS verification
FROM information_schema.check_constraints
WHERE constraint_name = 'runs_mode_check';

-- Vérifier les profils
SELECT
  'Profils avec xp_total NULL: ' || COUNT(*) AS verification
FROM public.profiles
WHERE xp_total IS NULL;

-- Vérifier quest_progress
SELECT
  'Nombre total de quest_progress: ' || COUNT(*) AS verification
FROM public.quest_progress;

-- Stats par utilisateur
SELECT
  p.display_name,
  p.xp_total,
  COUNT(qp.id) AS quest_count,
  COUNT(CASE WHEN qp.completed THEN 1 END) AS completed_count
FROM public.profiles p
LEFT JOIN public.quest_progress qp ON qp.user_id = p.id
GROUP BY p.id, p.display_name, p.xp_total
ORDER BY p.xp_total DESC
LIMIT 10;

SELECT '🎉 ✅ Migration terminée avec succès!' AS final_status;
