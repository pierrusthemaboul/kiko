import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🔧 Exécution des améliorations SQL...\n');
console.log('⚠️  IMPORTANT: Ce script ne peut pas exécuter du SQL directement.');
console.log('   Vous devez copier-coller le SQL ci-dessous dans Supabase Dashboard:\n');
console.log('='.repeat(80));
console.log(`
-- ========================================================================
-- AMÉLIORATION SCHEMA PRECISION_SCORES
-- Copier-coller dans: Supabase Dashboard > SQL Editor
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
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.precision_scores'::regclass;

SELECT indexname FROM pg_indexes
WHERE tablename IN ('precision_scores', 'profiles');

SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.precision_scores'::regclass;
`);
console.log('='.repeat(80));
console.log('\n📍 Instructions:');
console.log('1. Aller sur: https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/sql/new');
console.log('2. Copier-coller le SQL ci-dessus');
console.log('3. Cliquer sur "Run" (en bas à droite)');
console.log('4. Vérifier qu\'il n\'y a pas d\'erreurs\n');

// Vérifier l'état actuel
console.log('🔍 État actuel de la base de données:\n');

try {
  // Vérifier si la table existe
  const { data: scores, error: scoresError } = await supabase
    .from('precision_scores')
    .select('count')
    .limit(1);

  if (scoresError) {
    console.log('❌ Erreur lecture precision_scores:', scoresError.message);
  } else {
    console.log('✅ Table precision_scores accessible');
  }

  // Vérifier profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('high_score_precision')
    .not('high_score_precision', 'is', null)
    .limit(5);

  if (profilesError) {
    console.log('❌ Erreur lecture profiles:', profilesError.message);
  } else {
    console.log(`✅ Table profiles accessible (${profiles?.length || 0} joueurs avec high scores)`);
  }

} catch (err) {
  console.error('❌ Erreur:', err.message);
}

console.log('\n✨ Une fois le SQL exécuté, votre base sera optimisée!');
