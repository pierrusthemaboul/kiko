import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyImprovements() {
  console.log('🔧 Application des améliorations à precision_scores...\n');

  const improvements = [
    {
      name: 'Contrainte score >= 0',
      sql: `ALTER TABLE public.precision_scores
        ADD CONSTRAINT precision_scores_score_positive CHECK (score >= 0);`
    },
    {
      name: 'Validation longueur display_name',
      sql: `ALTER TABLE public.precision_scores
        ADD CONSTRAINT precision_scores_display_name_length
        CHECK (length(display_name) BETWEEN 1 AND 50);`
    },
    {
      name: 'Index composite date + score',
      sql: `CREATE INDEX IF NOT EXISTS idx_precision_scores_date_score
        ON public.precision_scores(created_at DESC, score DESC);`
    },
    {
      name: 'Index composite user + created',
      sql: `CREATE INDEX IF NOT EXISTS idx_precision_scores_user_created
        ON public.precision_scores(user_id, created_at DESC);`
    },
    {
      name: 'Index partiel top scores',
      sql: `CREATE INDEX IF NOT EXISTS idx_precision_scores_top
        ON public.precision_scores(score DESC)
        WHERE score >= 1000;`
    },
    {
      name: 'Index profiles.high_score_precision',
      sql: `CREATE INDEX IF NOT EXISTS idx_profiles_high_score_precision
        ON public.profiles(high_score_precision DESC NULLS LAST);`
    },
    {
      name: 'Fonction trigger update_high_score_precision',
      sql: `CREATE OR REPLACE FUNCTION update_high_score_precision()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE public.profiles
          SET high_score_precision = GREATEST(COALESCE(high_score_precision, 0), NEW.score)
          WHERE id = NEW.user_id;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;`
    },
    {
      name: 'Trigger trg_update_high_score',
      sql: `DROP TRIGGER IF EXISTS trg_update_high_score ON public.precision_scores;
        CREATE TRIGGER trg_update_high_score
          AFTER INSERT ON public.precision_scores
          FOR EACH ROW
          EXECUTE FUNCTION update_high_score_precision();`
    }
  ];

  for (const improvement of improvements) {
    try {
      console.log(`⏳ ${improvement.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: improvement.sql });

      if (error) {
        // Si exec_sql n'existe pas, essayer directement
        const { error: directError } = await supabase.from('_sql').select('*').limit(0);
        if (directError) {
          console.log(`⚠️  Impossible d'exécuter via RPC, tentative directe...`);
          // Fallback: écrire le SQL dans un fichier pour exécution manuelle
          throw new Error('Exécution SQL directe non disponible');
        }
      }

      console.log(`✅ ${improvement.name}`);
    } catch (err: any) {
      console.log(`❌ ${improvement.name}: ${err.message}`);
      console.log('   SQL à exécuter manuellement:\n');
      console.log(improvement.sql);
      console.log('\n');
    }
  }

  console.log('\n✨ Améliorations terminées!');
}

applyImprovements().catch(console.error);

