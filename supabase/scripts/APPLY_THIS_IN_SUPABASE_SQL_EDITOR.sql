-- ========================================================================
-- AMÉLIORATION SCHEMA PRECISION_SCORES
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ========================================================================

-- 1. Contrainte: score >= 0
ALTER TABLE public.precision_scores
  ADD CONSTRAINT precision_scores_score_positive CHECK (score >= 0);

-- 2. Validation: longueur display_name (1-50 caractères)
ALTER TABLE public.precision_scores
  ADD CONSTRAINT precision_scores_display_name_length
  CHECK (length(display_name) BETWEEN 1 AND 50);

-- 3. Index composite pour leaderboards daily/monthly (améliore performances)
CREATE INDEX IF NOT EXISTS idx_precision_scores_date_score
  ON public.precision_scores(created_at DESC, score DESC);

-- 4. Index composite pour requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_precision_scores_user_created
  ON public.precision_scores(user_id, created_at DESC);

-- 5. Index partiel pour top scores (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_precision_scores_top
  ON public.precision_scores(score DESC)
  WHERE score >= 1000;

-- 6. Index sur profiles.high_score_precision pour leaderboard all-time
CREATE INDEX IF NOT EXISTS idx_profiles_high_score_precision
  ON public.profiles(high_score_precision DESC NULLS LAST);

-- 7. Fonction trigger pour synchroniser automatiquement high_score_precision
-- Plus besoin de le faire manuellement dans le code TypeScript !
CREATE OR REPLACE FUNCTION update_high_score_precision()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le high score seulement si le nouveau score est meilleur
  UPDATE public.profiles
  SET high_score_precision = GREATEST(COALESCE(high_score_precision, 0), NEW.score)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger qui s'exécute à chaque insertion dans precision_scores
DROP TRIGGER IF EXISTS trg_update_high_score ON public.precision_scores;
CREATE TRIGGER trg_update_high_score
  AFTER INSERT ON public.precision_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_high_score_precision();

-- ========================================================================
-- VÉRIFICATIONS POST-EXÉCUTION
-- ========================================================================

-- Vérifier que tout fonctionne:
-- 1. Lister les contraintes
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.precision_scores'::regclass;

-- 2. Lister les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'precision_scores' OR tablename = 'profiles';

-- 3. Vérifier les triggers
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.precision_scores'::regclass;

-- ========================================================================
-- TEST DU TRIGGER (optionnel)
-- ========================================================================
-- Pour tester que le trigger fonctionne, vous pouvez:
-- 1. Trouver votre user_id: SELECT id FROM auth.users LIMIT 1;
-- 2. Insérer un score test:
-- INSERT INTO precision_scores (user_id, display_name, score)
-- VALUES ('VOTRE_USER_ID', 'Test', 9999);
-- 3. Vérifier que high_score_precision a été mis à jour:
-- SELECT high_score_precision FROM profiles WHERE id = 'VOTRE_USER_ID';
