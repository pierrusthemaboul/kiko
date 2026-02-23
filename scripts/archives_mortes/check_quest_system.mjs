import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuestSystem() {
  console.log('\n🔍 ===== VÉRIFICATION DU SYSTÈME DE QUÊTES =====\n');

  // 1. Vérifier toutes les quêtes actives
  console.log('📋 1. QUÊTES ACTIVES dans daily_quests:');
  const { data: allQuests, error: questsError } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('is_active', true)
    .order('quest_type', { ascending: true })
    .order('difficulty', { ascending: true });

  if (questsError) {
    console.error('❌ Erreur:', questsError);
    return;
  }

  console.log(`\n📊 Total: ${allQuests?.length || 0} quêtes actives`);

  // Grouper par type
  const byType = {};
  const byMode = {
    precision: [],
    date: [],
    classic: [],
    other: []
  };

  allQuests?.forEach(q => {
    // Par type
    if (!byType[q.quest_type]) byType[q.quest_type] = [];
    byType[q.quest_type].push(q);

    // Par mode (basé sur la quest_key ou description)
    const key = q.quest_key.toLowerCase();
    if (key.includes('precision')) {
      byMode.precision.push(q);
    } else if (key.includes('date')) {
      byMode.date.push(q);
    } else if (key.includes('classic')) {
      byMode.classic.push(q);
    } else {
      byMode.other.push(q);
    }
  });

  console.log('\n📊 Par type:');
  Object.entries(byType).forEach(([type, quests]) => {
    console.log(`   ${type}: ${quests.length} quêtes`);
  });

  console.log('\n📊 Par mode de jeu:');
  console.log(`   🎯 Précision: ${byMode.precision.length} quêtes`);
  console.log(`   📅 Date: ${byMode.date.length} quêtes`);
  console.log(`   🎮 Classic: ${byMode.classic.length} quêtes`);
  console.log(`   ❓ Autres: ${byMode.other.length} quêtes`);

  if (byMode.precision.length > 0) {
    console.log('\n⚠️  PROBLÈME DÉTECTÉ: Des quêtes liées au mode "Précision" sont actives!');
    console.log('   Le mode Précision est caché, ces quêtes devraient être désactivées:\n');
    byMode.precision.forEach(q => {
      console.log(`   - ${q.quest_key}: "${q.title}" (${q.quest_type})`);
    });
  }

  // 2. Vérifier un utilisateur test (chercher l'utilisateur Pierre)
  console.log('\n\n👤 2. VÉRIFICATION D\'UN UTILISATEUR TEST:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, xp_total, title_key, games_played')
    .order('games_played', { ascending: false })
    .limit(5);

  if (profilesError) {
    console.error('❌ Erreur:', profilesError);
    return;
  }

  console.log(`\n📊 Top 5 joueurs par parties jouées:`);
  profiles?.forEach((p, i) => {
    console.log(`   ${i + 1}. ID: ${p.id.substring(0, 8)}... - XP: ${p.xp_total} - Rang: ${p.title_key} - Parties: ${p.games_played}`);
  });

  if (profiles && profiles.length > 0) {
    const testUser = profiles[0];
    console.log(`\n🔍 Inspection détaillée de l'utilisateur: ${testUser.id.substring(0, 8)}...`);

    // Récupérer les quest_progress
    const { data: questProgress, error: progressError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', testUser.id)
      .order('completed', { ascending: true });

    if (progressError) {
      console.error('❌ Erreur:', progressError);
      return;
    }

    console.log(`\n📊 Quest Progress: ${questProgress?.length || 0} entrées`);

    const completed = questProgress?.filter(q => q.completed) || [];
    const claimed = questProgress?.filter(q => q.claimed) || [];
    const completedNotClaimed = questProgress?.filter(q => q.completed && !q.claimed) || [];

    console.log(`   ✅ Complétées: ${completed.length}`);
    console.log(`   💰 Réclamées: ${claimed.length}`);
    console.log(`   ⚠️  Complétées mais non réclamées: ${completedNotClaimed.length}`);

    if (completedNotClaimed.length > 0) {
      console.log('\n   🎯 Quêtes en attente de réclamation:');
      for (const qp of completedNotClaimed) {
        // Récupérer les détails de la quête
        const { data: questDetails } = await supabase
          .from('daily_quests')
          .select('*')
          .eq('quest_key', qp.quest_key)
          .single();

        if (questDetails) {
          console.log(`      - ${qp.quest_key}: "${questDetails.title}"`);
          console.log(`        Progress: ${qp.current_value}/${questDetails.target_value}`);
          console.log(`        Récompense: ${questDetails.xp_reward} XP`);
        } else {
          console.log(`      - ${qp.quest_key}: ⚠️  QUÊTE INTROUVABLE dans daily_quests!`);
        }
      }
    }

    // Vérifier les quest_progress qui pointent vers des quêtes qui n'existent plus
    console.log('\n🔍 Vérification de la cohérence quest_progress <-> daily_quests:');
    let orphanCount = 0;
    for (const qp of questProgress || []) {
      const { data: questExists } = await supabase
        .from('daily_quests')
        .select('quest_key')
        .eq('quest_key', qp.quest_key)
        .single();

      if (!questExists) {
        orphanCount++;
        console.log(`   ⚠️  quest_progress orphelin: ${qp.quest_key} (n'existe plus dans daily_quests)`);
      }
    }

    if (orphanCount === 0) {
      console.log('   ✅ Tous les quest_progress ont une quête correspondante');
    } else {
      console.log(`   ⚠️  ${orphanCount} quest_progress orphelins détectés`);
    }
  }

  // 3. Vérifier les contraintes de la table quest_progress
  console.log('\n\n🔧 3. VÉRIFICATION DE LA STRUCTURE DE LA BASE:');

  // Test: essayer de récupérer un quest_progress avec join
  const { data: joinTest, error: joinError } = await supabase
    .from('quest_progress')
    .select('*, daily_quests(*)')
    .limit(1);

  if (joinError) {
    console.log('   ⚠️  Problème avec le JOIN quest_progress <-> daily_quests');
    console.log('   Erreur:', joinError.message);
  } else {
    console.log('   ✅ JOIN quest_progress <-> daily_quests fonctionne');
  }

  console.log('\n✅ ===== FIN DE LA VÉRIFICATION =====\n');
}

checkQuestSystem().catch(console.error);
