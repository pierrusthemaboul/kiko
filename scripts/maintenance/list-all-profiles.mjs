import { supabase } from './supabase-helper.mjs';

async function listProfiles() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp_total', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`\n👥 ${profiles.length} profil(s) trouvé(s):\n`);

  profiles.forEach((p, i) => {
    console.log(`${i + 1}. "${p.display_name}" (ID: ${p.id})`);
    console.log(`   XP: ${p.xp_total} | Parties: ${p.games_played} | Meilleur score: ${p.high_score || 0}`);
    console.log('');
  });
}

listProfiles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });

