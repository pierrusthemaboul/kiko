import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function fixXpTotal() {
  console.log('\n🔧 === CORRECTION xp_total AVEC SERVICE_ROLE ===\n');

  // 1. Lire le profil actuel
  console.log('1️⃣ Lecture du profil actuel...');
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (readError) {
    console.error('❌ Erreur lecture:', readError);
    return;
  }

  console.log('\n📊 Profil actuel:');
  console.log(`  - display_name: ${profile.display_name}`);
  console.log(`  - xp_total: ${profile.xp_total} (type: ${typeof profile.xp_total})`);
  console.log(`  - games_played: ${profile.games_played}`);
  console.log(`  - current_streak: ${profile.current_streak}`);
  console.log(`  - high_score: ${profile.high_score}`);
  console.log(`  - high_score_precision: ${profile.high_score_precision}`);

  // 2. Corriger xp_total si NULL ou invalide
  const currentXp = profile.xp_total;

  if (currentXp === null || currentXp === undefined || Number.isNaN(currentXp)) {
    console.log('\n⚠️  xp_total est NULL/undefined/NaN, correction nécessaire...');

    // Utiliser 49843 (valeur du premier dump que tu as fourni)
    const correctedXp = 49843;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ xp_total: correctedXp })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Erreur lors de la correction:', updateError);
    } else {
      console.log(`✅ xp_total corrigé: ${correctedXp}`);

      // Vérifier
      const { data: updated } = await supabase
        .from('profiles')
        .select('xp_total')
        .eq('id', userId)
        .single();

      console.log(`✅ Vérification: xp_total = ${updated?.xp_total}`);
    }
  } else {
    console.log(`✅ xp_total est déjà valide: ${currentXp}`);
  }

  // 3. Vérifier tous les profils avec xp_total problématique
  console.log('\n2️⃣ Vérification globale...');

  const { data: allProfiles, error: allError } = await supabase
    .from('profiles')
    .select('id, display_name, xp_total')
    .or('xp_total.is.null');

  if (allError) {
    console.error('❌ Erreur:', allError);
  } else {
    console.log(`\n📊 Profils avec xp_total NULL: ${allProfiles?.length || 0}`);

    if (allProfiles && allProfiles.length > 0) {
      console.log('\n⚠️  Correction de tous les profils NULL...');

      for (const prof of allProfiles) {
        const { error: fixError } = await supabase
          .from('profiles')
          .update({ xp_total: 0 })
          .eq('id', prof.id);

        if (fixError) {
          console.error(`❌ Erreur pour ${prof.display_name}:`, fixError);
        } else {
          console.log(`✅ ${prof.display_name}: xp_total = 0`);
        }
      }
    }
  }

  // 4. Vérifier les quest_progress
  console.log('\n3️⃣ Vérification quest_progress...');

  const { data: questProgress, error: questError } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId);

  if (questError) {
    console.error('❌ Erreur:', questError);
  } else {
    console.log(`\n📊 Nombre de quest_progress: ${questProgress?.length || 0}`);

    if (questProgress && questProgress.length > 0) {
      const byType = questProgress.reduce((acc, q) => {
        const type = q.quest_key.split('_')[0];
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Distribution:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

      const completed = questProgress.filter(q => q.completed).length;
      console.log(`  - Complétées: ${completed}`);
      console.log(`  - En cours: ${questProgress.length - completed}`);
    }
  }

  console.log('\n✅ Diagnostic terminé!\n');
}

fixXpTotal().catch(console.error);

