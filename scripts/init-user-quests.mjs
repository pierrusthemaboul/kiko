/**
 * Initialise les quest_progress pour un utilisateur spécifique
 */
import { supabase } from './supabase-helper.mjs';

async function initUserQuests(userName) {
  console.log(`🔍 Recherche de l'utilisateur "${userName}"...\n`);

  // 1. Trouver l'utilisateur
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', userName);

  if (profileError) {
    console.error('❌ Erreur:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log(`❌ Aucun utilisateur trouvé avec le nom "${userName}"`);
    console.log('\n📋 Liste de tous les utilisateurs:');

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .order('display_name');

    if (allProfiles && allProfiles.length > 0) {
      allProfiles.forEach(p => {
        console.log(`  - ${p.display_name} (ID: ${p.id})`);
      });
    } else {
      console.log('  Aucun profil trouvé');
    }
    return;
  }

  const user = profiles[0];
  console.log(`✅ Utilisateur trouvé: ${user.display_name} (ID: ${user.id})\n`);

  // 2. Récupérer toutes les quêtes disponibles
  const { data: allQuests, error: questsError } = await supabase
    .from('daily_quests')
    .select('*');

  if (questsError) {
    console.error('❌ Erreur récupération quêtes:', questsError);
    return;
  }

  console.log(`📋 ${allQuests.length} quêtes disponibles\n`);

  // 3. Vérifier les quest_progress existants
  const { data: existingProgress, error: progressError } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', user.id);

  if (progressError) {
    console.error('❌ Erreur récupération progress:', progressError);
    return;
  }

  console.log(`📊 ${existingProgress?.length || 0} quest_progress existants\n`);

  const existingKeys = new Set(existingProgress?.map(p => p.quest_key) || []);
  const missingQuests = allQuests.filter(q => !existingKeys.has(q.quest_key));

  if (missingQuests.length === 0) {
    console.log('✅ Toutes les quêtes sont déjà initialisées pour cet utilisateur\n');

    console.log('📊 État actuel des quêtes:');
    existingProgress.forEach(p => {
      const quest = allQuests.find(q => q.quest_key === p.quest_key);
      const percentage = quest ? Math.min(100, (p.current_value / quest.target_value) * 100).toFixed(1) : 0;
      console.log(`  ${p.completed ? '✅' : '⏳'} ${quest?.title || p.quest_key}`);
      console.log(`     ${p.current_value}/${quest?.target_value || '?'} (${percentage}%)`);
    });
    return;
  }

  console.log(`⚠️  ${missingQuests.length} quête(s) manquante(s):\n`);
  missingQuests.forEach(q => {
    console.log(`  • ${q.title} (${q.quest_key})`);
  });

  console.log('\n💾 Initialisation des quêtes manquantes...\n');

  const toInsert = missingQuests.map(quest => ({
    user_id: user.id,
    quest_key: quest.quest_key,
    current_value: 0,
    completed: false,
    assigned_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from('quest_progress')
    .insert(toInsert);

  if (insertError) {
    console.error('❌ Erreur insertion:', insertError);
    return;
  }

  console.log(`✅ ${missingQuests.length} quête(s) initialisée(s) avec succès!\n`);

  // Afficher l'état final
  const { data: finalProgress } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', user.id);

  console.log(`📊 État final: ${finalProgress?.length || 0} quêtes actives\n`);
}

// Récupérer le nom d'utilisateur depuis les arguments
const userName = process.argv[2];

if (!userName) {
  console.error('❌ Usage: node init-user-quests.mjs <nom_utilisateur>');
  console.log('\nExemple: node init-user-quests.mjs Pierrot');
  process.exit(1);
}

initUserQuests(userName)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
