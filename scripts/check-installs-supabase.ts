import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

async function checkInstalls() {
  console.log('📊 Statistiques d\'installation via Supabase\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString();

    // 1. Nouveaux utilisateurs (48h)
    console.log('\n👥 NOUVEAUX UTILISATEURS (48h)\n');

    const { data: newUsers, error: errorNewUsers } = await supabase
      .from('game_scores')
      .select('user_id, created_at')
      .gte('created_at', twoDaysAgoStr)
      .order('created_at', { ascending: false });

    if (errorNewUsers) {
      console.error('Erreur:', errorNewUsers);
    } else {
      // Compter les utilisateurs uniques
      const uniqueUsers = new Set(newUsers?.map(u => u.user_id) || []);
      console.log(`✅ Nouveaux joueurs uniques: ${uniqueUsers.size}`);
      console.log(`🎮 Nombre total de parties jouées: ${newUsers?.length || 0}`);
    }

    // 2. Utilisateurs par jour
    console.log('\n📅 RÉPARTITION PAR JOUR\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    // Hier
    const { data: usersYesterday } = await supabase
      .from('game_scores')
      .select('user_id')
      .gte('created_at', yesterdayStr + 'T00:00:00')
      .lt('created_at', todayStr + 'T00:00:00');

    const uniqueYesterday = new Set(usersYesterday?.map(u => u.user_id) || []);

    // Aujourd'hui
    const { data: usersToday } = await supabase
      .from('game_scores')
      .select('user_id')
      .gte('created_at', todayStr + 'T00:00:00');

    const uniqueToday = new Set(usersToday?.map(u => u.user_id) || []);

    console.log(`📆 Hier (${yesterdayStr}):`);
    console.log(`   - ${uniqueYesterday.size} joueurs uniques`);
    console.log(`   - ${usersYesterday?.length || 0} parties jouées`);

    console.log(`\n📆 Aujourd'hui (${todayStr}):`);
    console.log(`   - ${uniqueToday.size} joueurs uniques`);
    console.log(`   - ${usersToday?.length || 0} parties jouées`);

    // 3. Statistiques globales
    console.log('\n📊 STATISTIQUES GLOBALES\n');

    const { count: totalGames } = await supabase
      .from('game_scores')
      .select('*', { count: 'exact', head: true });

    const { data: allUsers } = await supabase
      .from('game_scores')
      .select('user_id');

    const totalUniqueUsers = new Set(allUsers?.map(u => u.user_id) || []).size;

    console.log(`👥 Total utilisateurs uniques: ${totalUniqueUsers}`);
    console.log(`🎮 Total parties jouées: ${totalGames || 0}`);
    console.log(`📊 Moyenne parties/joueur: ${((totalGames || 0) / totalUniqueUsers).toFixed(1)}`);

    // 4. Top scores 48h
    console.log('\n🏆 TOP SCORES (48h)\n');

    const { data: topScores } = await supabase
      .from('game_scores')
      .select('score, user_id, game_mode, created_at')
      .gte('created_at', twoDaysAgoStr)
      .order('score', { ascending: false })
      .limit(5);

    topScores?.forEach((s, i) => {
      const mode = s.game_mode === 'classique' ? '🎯' : '🎖️';
      const date = new Date(s.created_at).toLocaleString('fr-FR');
      console.log(`${i + 1}. ${mode} ${s.score} points - ${date}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('ℹ️  NOTE:');
    console.log('='.repeat(60));
    console.log('Ces statistiques sont basées sur les utilisateurs ACTIFS');
    console.log('(ceux qui ont joué au moins une partie).');
    console.log('');
    console.log('Pour les téléchargements Play Store réels:');
    console.log('👉 https://play.google.com/console');
    console.log('   Statistiques > Acquisition des utilisateurs');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkInstalls();
