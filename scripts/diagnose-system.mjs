/**
 * Diagnostic complet du système de quêtes
 */
import { supabase } from './supabase-helper.mjs';

async function diagnose() {
  console.log('🔍 ===== DIAGNOSTIC COMPLET DU SYSTÈME =====\n');

  // 1. Vérifier la connexion Supabase
  console.log('1️⃣ Vérification de la connexion Supabase...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.log('❌ Erreur auth:', authError.message);
    console.log('⚠️  Vous n\'êtes pas connecté via le client Supabase\n');
  } else if (user) {
    console.log('✅ Utilisateur connecté:', user.email);
    console.log('   ID:', user.id, '\n');
  } else {
    console.log('⚠️  Aucun utilisateur connecté\n');
  }

  // 2. Compter les profils
  console.log('2️⃣ Vérification de la table profiles...');
  const { count: profileCount, error: profileCountError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (profileCountError) {
    console.log('❌ Erreur:', profileCountError.message, '\n');
  } else {
    console.log(`   Total profils: ${profileCount || 0}\n`);

    if (profileCount > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, xp_total, games_played')
        .order('xp_total', { ascending: false })
        .limit(5);

      console.log('   Top 5 profils:');
      profiles?.forEach(p => {
        console.log(`   • ${p.display_name || 'Sans nom'} - XP: ${p.xp_total}, Parties: ${p.games_played}`);
      });
      console.log('');
    }
  }

  // 3. Compter les quêtes
  console.log('3️⃣ Vérification de la table daily_quests...');
  const { count: questCount, error: questCountError } = await supabase
    .from('daily_quests')
    .select('*', { count: 'exact', head: true });

  if (questCountError) {
    console.log('❌ Erreur:', questCountError.message, '\n');
  } else {
    console.log(`   Total quêtes définies: ${questCount || 0}\n`);

    if (questCount > 0) {
      const { data: quests } = await supabase
        .from('daily_quests')
        .select('quest_key, title, quest_type')
        .limit(5);

      console.log('   Exemples de quêtes:');
      quests?.forEach(q => {
        console.log(`   • ${q.title} (${q.quest_type})`);
      });
      console.log('');
    }
  }

  // 4. Compter les quest_progress
  console.log('4️⃣ Vérification de la table quest_progress...');
  const { count: progressCount, error: progressCountError } = await supabase
    .from('quest_progress')
    .select('*', { count: 'exact', head: true });

  if (progressCountError) {
    console.log('❌ Erreur:', progressCountError.message, '\n');
  } else {
    console.log(`   Total quest_progress: ${progressCount || 0}\n`);

    if (progressCount > 0) {
      const { data: progressSample } = await supabase
        .from('quest_progress')
        .select('user_id, quest_key, current_value, completed')
        .limit(5);

      console.log('   Exemples:');
      progressSample?.forEach(p => {
        console.log(`   • User ${p.user_id.substring(0, 8)}... - ${p.quest_key}: ${p.current_value} ${p.completed ? '✅' : '⏳'}`);
      });
      console.log('');
    }
  }

  // 5. Compter les runs
  console.log('5️⃣ Vérification de la table runs...');
  const { count: runsCount, error: runsCountError } = await supabase
    .from('runs')
    .select('*', { count: 'exact', head: true });

  if (runsCountError) {
    console.log('❌ Erreur:', runsCountError.message, '\n');
  } else {
    console.log(`   Total parties jouées: ${runsCount || 0}\n`);

    if (runsCount > 0) {
      const { data: recentRuns } = await supabase
        .from('runs')
        .select('user_id, mode, points, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('   Dernières parties:');
      recentRuns?.forEach(r => {
        console.log(`   • ${new Date(r.created_at).toLocaleString('fr-FR')} - ${r.mode} - ${r.points} pts`);
      });
      console.log('');
    }
  }

  // 6. Résumé
  console.log('📊 ===== RÉSUMÉ =====');
  console.log(`   Profils: ${profileCount || 0}`);
  console.log(`   Quêtes définies: ${questCount || 0}`);
  console.log(`   Quest progress: ${progressCount || 0}`);
  console.log(`   Parties jouées: ${runsCount || 0}`);
  console.log('');

  if (profileCount === 0) {
    console.log('⚠️  PROBLÈME DÉTECTÉ:');
    console.log('   Aucun profil n\'existe dans la base.');
    console.log('   Les profils doivent être créés lors de l\'inscription.');
    console.log('   Vérifiez que le trigger de création de profil fonctionne.');
  }

  if (questCount > 0 && progressCount === 0) {
    console.log('⚠️  PROBLÈME DÉTECTÉ:');
    console.log('   Des quêtes existent mais aucun quest_progress.');
    console.log('   Les utilisateurs doivent avoir leurs quêtes initialisées.');
  }

  console.log('\n===== FIN DU DIAGNOSTIC =====');
}

diagnose()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
