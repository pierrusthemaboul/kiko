import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U'
);

// Récupérer le profil avec le plus de XP (probablement vous)
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, display_name, xp_total, games_played, high_score')
  .order('xp_total', { ascending: false })
  .limit(1);

if (!profiles || profiles.length === 0) {
  console.log('Aucun profil trouvé');
  process.exit(1);
}

const profile = profiles[0];
console.log('=== PROFIL ===');
console.log('Nom:', profile.display_name);
console.log('XP:', profile.xp_total);
console.log('Parties jouées:', profile.games_played);
console.log('High score:', profile.high_score);

// Vérifier les runs récents
const { data: runs } = await supabase
  .from('runs')
  .select('*')
  .eq('user_id', profile.id)
  .order('created_at', { ascending: false })
  .limit(3);

console.log('\n=== DERNIÈRES PARTIES ===');
if (runs && runs.length > 0) {
  runs.forEach(r => {
    console.log(`Points: ${r.points}, XP: ${r.xp_earned}, Mode: ${r.mode}, Date: ${r.created_at}`);
  });
} else {
  console.log('Aucune partie trouvée');
}

// Vérifier quest_progress
const { data: progress } = await supabase
  .from('quest_progress')
  .select('*')
  .eq('user_id', profile.id)
  .order('quest_key');

const count = progress ? progress.length : 0;
console.log(`\n=== PROGRESSION QUÊTES (${count}) ===`);
if (progress && progress.length > 0) {
  progress.forEach(p => {
    console.log(`${p.quest_key}: ${p.current_value} (completed: ${p.completed}, updated: ${p.updated_at})`);
  });
} else {
  console.log('❌ AUCUNE PROGRESSION');
}
