import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testResetSystem() {
  console.log('\n🔍 ===== TEST DU SYSTÈME DE RESET DES QUÊTES =====\n');

  // 1. Vérifier les quêtes expirées
  console.log('📋 1. QUÊTES EXPIRÉES:');
  const now = new Date();
  const { data: expiredQuests, error: expiredError } = await supabase
    .from('quest_progress')
    .select('id, user_id, quest_key, reset_at, completed, claimed')
    .lt('reset_at', now.toISOString());

  if (expiredError) {
    console.error('   ❌ Erreur:', expiredError.message);
  } else {
    console.log(`   Total: ${expiredQuests?.length || 0} quêtes expirées`);

    if (expiredQuests && expiredQuests.length > 0) {
      console.log('\n   ⚠️  PROBLÈME: Des quêtes expirées existent encore en base!');
      console.log('   Cela signifie que le cron job NE FONCTIONNE PAS.\n');

      // Grouper par date d'expiration
      const byResetDate = {};
      expiredQuests.forEach(q => {
        const date = q.reset_at.split('T')[0];
        if (!byResetDate[date]) byResetDate[date] = 0;
        byResetDate[date]++;
      });

      console.log('   Distribution par date d\'expiration:');
      Object.entries(byResetDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, count]) => {
          const daysAgo = Math.floor((now - new Date(date)) / (1000 * 60 * 60 * 24));
          console.log(`      ${date}: ${count} quêtes (expiré il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''})`);
        });
    } else {
      console.log('   ✅ Aucune quête expirée (le système fonctionne!)');
    }
  }

  // 2. Vérifier les reset_at futurs
  console.log('\n\n📅 2. DATES DE RESET À VENIR:');
  const { data: allProgress, error: progressError } = await supabase
    .from('quest_progress')
    .select('reset_at, quest_key')
    .gte('reset_at', now.toISOString())
    .order('reset_at', { ascending: true })
    .limit(10);

  if (progressError) {
    console.error('   ❌ Erreur:', progressError.message);
  } else if (allProgress && allProgress.length > 0) {
    const byDate = {};
    allProgress.forEach(q => {
      const date = q.reset_at.split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(q.quest_key);
    });

    console.log('   Prochaines dates de reset:');
    Object.entries(byDate).slice(0, 3).forEach(([date, quests]) => {
      const daysUntil = Math.ceil((new Date(date) - now) / (1000 * 60 * 60 * 24));
      console.log(`      ${date}: ${quests.length} quêtes (dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''})`);
    });
  }

  // 3. Vérifier la fonction SQL
  console.log('\n\n🔧 3. TEST DE LA FONCTION SQL:');
  try {
    const { data, error } = await supabase.rpc('reset_expired_quests');

    if (error) {
      console.log('   ❌ La fonction SQL est BUGGUÉE:', error.message);
      console.log('\n   💡 SOLUTION: Exécutez le SQL dans scripts/FINAL-setup-quest-reset-cron.sql');
    } else {
      console.log('   ✅ Fonction opérationnelle');
      console.log('   Résultat:', data);
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message);
  }

  // 4. Vérifier s'il y a des utilisateurs sans quêtes
  console.log('\n\n👥 4. UTILISATEURS ACTIFS SANS QUÊTES:');
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: activeProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .gte('last_play_date', sevenDaysAgo);

  if (profilesError) {
    console.error('   ❌ Erreur:', profilesError.message);
  } else {
    console.log(`   Utilisateurs actifs (7 derniers jours): ${activeProfiles?.length || 0}`);

    if (activeProfiles && activeProfiles.length > 0) {
      let usersWithoutQuests = 0;

      for (const profile of activeProfiles.slice(0, 10)) { // Vérifier les 10 premiers
        const { data: quests } = await supabase
          .from('quest_progress')
          .select('id')
          .eq('user_id', profile.id);

        if (!quests || quests.length === 0) {
          usersWithoutQuests++;
        }
      }

      if (usersWithoutQuests > 0) {
        console.log(`   ⚠️  ${usersWithoutQuests} utilisateur(s) sans quêtes (sur ${Math.min(10, activeProfiles.length)} vérifiés)`);
        console.log('   Ces utilisateurs n\'ont jamais ouvert l\'app ou le lazy loading a échoué.');
      } else {
        console.log(`   ✅ Tous les utilisateurs vérifiés ont des quêtes`);
      }
    }
  }

  // 5. Statistiques générales
  console.log('\n\n📊 5. STATISTIQUES GÉNÉRALES:');

  const { count: totalProgress } = await supabase
    .from('quest_progress')
    .select('*', { count: 'exact', head: true });

  const { count: completedCount } = await supabase
    .from('quest_progress')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true);

  const { count: claimedCount } = await supabase
    .from('quest_progress')
    .select('*', { count: 'exact', head: true })
    .eq('claimed', true);

  console.log(`   Total quest_progress: ${totalProgress || 0}`);
  console.log(`   Complétées: ${completedCount || 0} (${Math.round((completedCount || 0) / (totalProgress || 1) * 100)}%)`);
  console.log(`   Réclamées: ${claimedCount || 0} (${Math.round((claimedCount || 0) / (completedCount || 1) * 100)}% des complétées)`);

  // Résumé
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 RÉSUMÉ:\n');

  const hasExpiredQuests = expiredQuests && expiredQuests.length > 0;

  if (hasExpiredQuests) {
    console.log('   🔴 PROBLÈME: Le cron job de reset automatique NE FONCTIONNE PAS');
    console.log('      - Des quêtes expirées existent encore en base');
    console.log('      - Les joueurs ne reçoivent de nouvelles quêtes qu\'au lancement de l\'app');
    console.log('\n   ⚠️  ACTION REQUISE:');
    console.log('      1. Exécutez le SQL dans: scripts/FINAL-setup-quest-reset-cron.sql');
    console.log('      2. Cela corrigera la fonction reset_expired_quests()');
    console.log('      3. Cela installera le cron job pour un reset automatique à minuit UTC');
  } else {
    console.log('   ✅ Le système de reset fonctionne correctement');
    console.log('      - Aucune quête expirée en base');
    console.log('      - Le lazy loading fonctionne au lancement de l\'app');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

testResetSystem().catch(console.error);
