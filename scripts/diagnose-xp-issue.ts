import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function diagnose() {
  console.log('\n🔍 === DIAGNOSTIC DÉTAILLÉ ===\n');

  // Le problème : le code dans apply.ts utilise supabase depuis le client
  // qui est authentifié. Simulons cela en utilisant le même pattern.

  console.log('📊 Test 1: Requête SELECT sur profiles (comme dans apply.ts ligne 164-168)');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('xp_total, title_key, parties_per_day, current_streak, best_streak, last_play_date, games_played, high_score')
    .eq('id', userId)
    .maybeSingle();

  console.log('Résultat:');
  console.log('  - Erreur:', profileError);
  console.log('  - Profile:', profile);

  if (profile) {
    console.log('\n📋 Détails du profil:');
    Object.entries(profile).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value} (type: ${typeof value})`);
    });
  }

  // Vérifier la politique RLS
  console.log('\n🔒 Test 2: Vérification RLS');
  console.log('La clé anon a-t-elle accès aux données ?');

  const { data: anyProfile, error: anyError } = await supabase
    .from('profiles')
    .select('id, display_name, xp_total')
    .limit(1)
    .maybeSingle();

  console.log('Résultat (n\'importe quel profil):');
  console.log('  - Erreur:', anyError);
  console.log('  - Profil trouvé:', anyProfile ? 'OUI' : 'NON');
  if (anyProfile) {
    console.log('  - xp_total:', anyProfile.xp_total, '(type:', typeof anyProfile.xp_total, ')');
  }

  // Tester l'UPDATE
  console.log('\n✏️ Test 3: Simulation UPDATE');
  console.log('Valeurs calculées (comme dans apply.ts):');

  const currentStoredXp = profile?.xp_total ?? 0;
  const xpEarned = 896; // Points de la dernière partie
  const newXp = currentStoredXp + xpEarned;

  console.log(`  - currentStoredXp: ${currentStoredXp} (type: ${typeof currentStoredXp})`);
  console.log(`  - xpEarned: ${xpEarned}`);
  console.log(`  - newXp: ${newXp} (type: ${typeof newXp})`);
  console.log(`  - newXp is NaN?: ${Number.isNaN(newXp)}`);
  console.log(`  - newXp is null?: ${newXp === null}`);
  console.log(`  - newXp is undefined?: ${newXp === undefined}`);

  // Tester si on peut lire les runs
  console.log('\n📊 Test 4: Vérifier les runs en mode precision');
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'precision')
    .limit(3);

  console.log('Résultat:');
  console.log('  - Erreur:', runsError);
  console.log('  - Nombre de runs:', runs?.length || 0);
  if (runs && runs.length > 0) {
    runs.forEach((run, i) => {
      console.log(`  ${i + 1}. points: ${run.points}, xp_earned: ${run.xp_earned}, created_at: ${run.created_at}`);
    });
  }

  console.log('\n');
}

diagnose().catch(console.error);
