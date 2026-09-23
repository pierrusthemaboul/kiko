const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ppxmtnuewcixbbmhnzzc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'pierre.cousin2@proton.me';
  console.log(`Recherche de l'utilisateur avec l'email: ${email}...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Erreur lors de la récupération des utilisateurs:', listError.message);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log(`Aucun utilisateur trouvé avec l'email ${email}.`);
    return;
  }
  
  const userId = user.id;
  console.log(`Utilisateur trouvé: ${userId}. Suppression des dépendances dans public...`);
  await supabase.from('quest_progress').delete().eq('user_id', userId);
  await supabase.from('user_achievements').delete().eq('user_id', userId);
  await supabase.from('runs').delete().eq('user_id', userId);
  await supabase.from('game_scores').delete().eq('user_id', userId);
  await supabase.from('leaderboard_rewards').delete().eq('user_id', userId);
  await supabase.from('ad_reward_transactions').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('id', userId);
  
  console.log('Suppression de l\'utilisateur dans auth...');
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('Erreur lors de la suppression de l\'utilisateur auth:', deleteError.message);
  } else {
    console.log('Utilisateur supprimé avec succès !');
  }
}

run();
