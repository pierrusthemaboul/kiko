-- Améliorations pour precision_scores
-- À exécuter après precision_scores_schema.sql

-- 1. Ajouter contrainte sur score (>= 0)
ALTER TABLE public.precision_scores
  ADD CONSTRAINT precision_scores_score_positive CHECK (score >= 0);

-- 2. Optionnel: Rendre user_id NOT NULL si vous ne voulez pas de scores anonymes
-- Décommentez si nécessaire:
-- ALTER TABLE public.precision_scores
--   ALTER COLUMN user_id SET NOT NULL;

-- 3. Validation du display_name (longueur raisonnable)
ALTER TABLE public.precision_scores
  ADD CONSTRAINT precision_scores_display_name_length
  CHECK (length(display_name) BETWEEN 1 AND 50);

-- 4. Index composite pour les leaderboards (date + score)
-- Améliore les performances des requêtes daily/monthly
CREATE INDEX IF NOT EXISTS idx_precision_scores_date_score
  ON public.precision_scores(created_at DESC, score DESC);

-- 5. Index composite pour les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_precision_scores_user_created
  ON public.precision_scores(user_id, created_at DESC);

-- 6. Index partiel pour les meilleurs scores (optionnel, si beaucoup de données)
CREATE INDEX IF NOT EXISTS idx_precision_scores_top
  ON public.precision_scores(score DESC)
  WHERE score >= 1000;

-- 7. Trigger pour synchroniser automatiquement high_score_precision dans profiles
CREATE OR REPLACE FUNCTION update_high_score_precision()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET high_score_precision = GREATEST(COALESCE(high_score_precision, 0), NEW.score)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_high_score ON public.precision_scores;
CREATE TRIGGER trg_update_high_score
  AFTER INSERT ON public.precision_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_high_score_precision();

-- 8. Fonction pour limiter le nombre de scores par utilisateur (protection anti-spam)
-- Optionnel: décommentez si vous voulez limiter à 10000 scores max par utilisateur
/*
CREATE OR REPLACE FUNCTION check_precision_scores_limit()
RETURNS TRIGGER AS $$
DECLARE
  score_count int;
BEGIN
  SELECT COUNT(*) INTO score_count
  FROM public.precision_scores
  WHERE user_id = NEW.user_id;

  IF score_count >= 10000 THEN
    RAISE EXCEPTION 'Nombre maximum de scores atteint pour cet utilisateur';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_scores_limit ON public.precision_scores;
CREATE TRIGGER trg_check_scores_limit
  BEFORE INSERT ON public.precision_scores
  FOR EACH ROW
  EXECUTE FUNCTION check_precision_scores_limit();
*/

-- 9. Ajouter un index sur high_score_precision pour les leaderboards all-time
CREATE INDEX IF NOT EXISTS idx_profiles_high_score_precision
  ON public.profiles(high_score_precision DESC NULLS LAST);

-- 10. Optionnel: Politique de nettoyage des vieux scores (garde seulement 90 jours)
-- Décommentez et créez un job cron/pg_cron si nécessaire:
/*
CREATE OR REPLACE FUNCTION cleanup_old_precision_scores()
RETURNS void AS $$
BEGIN
  DELETE FROM public.precision_scores
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter manuellement ou via pg_cron:
-- SELECT cron.schedule('cleanup-precision-scores', '0 3 * * 0', 'SELECT cleanup_old_precision_scores()');
*/
