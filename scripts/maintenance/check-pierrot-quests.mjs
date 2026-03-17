/**
 * Vérification des quêtes de Pierrot
 */
import { supabase } from './supabase-helper.mjs';

async function checkPierrotQuests() {
  console.log('🔍 VÉRIFICATION DES QUÊTES DE PIERROT\n');

  // 1. Trouver le profil Pierrot
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', 'Pierrot');

  if (profileError) {
    console.error('❌ Erreur profil:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('❌ Aucun profil trouvé avec le nom "Pierrot"');
    return;
  }

  const profile = profiles[0];
  console.log(`✅ Profil trouvé: ${profile.display_name} (ID: ${profile.id})`);
  console.log(`   XP Total: ${profile.xp_total}`);
  console.log(`   Parties jouées: ${profile.games_played}`);
  console.log(`   Meilleur score: ${profile.high_score}\n`);

  // 2. Récupérer les quêtes actives
  const { data: quests, error: questsError } = await supabase
    .from('daily_quests')
    .select('*');

  if (questsError) {
    console.error('❌ Erreur quêtes:', questsError);
    return;
  }

  console.log(`📋 ${quests.length} quêtes disponibles:\n`);

  // 3. Récupérer la progression de l'utilisateur
  const { data: progress, error: progressError } = await supabase
    .from('quest_progress')
    .eq('user_id', profile.id)
    .select('*');

  if (progressError) {
    console.error('❌ Erreur progression:', progressError);
    return;
  }

  console.log(`📊 Progression actuelle (${progress.length} quêtes trackées):\n`);

  quests.forEach(quest => {
    const userProgress = progress.find(p => p.quest_key === quest.quest_key);
    const currentValue = userProgress?.current_value || 0;
    const isCompleted = userProgress?.completed || false;
    const percentage = Math.min(100, (currentValue / quest.target_value) * 100).toFixed(1);

    console.log(`  • ${quest.title}`);
    console.log(`    Type: ${quest.quest_type}`);
    console.log(`    Cible: ${quest.target_value}`);
    console.log(`    Progression: ${currentValue}/${quest.target_value} (${percentage}%)`);
    console.log(`    Complétée: ${isCompleted ? '✅' : '❌'}`);
    console.log(`    Récompense: ${quest.xp_reward} XP`);

    if (userProgress) {
      console.log(`    Dernière MAJ: ${new Date(userProgress.updated_at).toLocaleString('fr-FR')}`);
    } else {
      console.log(`    ⚠️  Aucune progression trackée pour cette quête`);
    }
    console.log('');
  });

  // 4. Vérifier les dernières parties jouées
  console.log('\n🎮 DERNIÈRES PARTIES:\n');
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('❌ Erreur runs:', runsError);
    return;
  }

  runs.forEach((run, i) => {
    console.log(`  ${i + 1}. Score: ${run.score} | Mode: ${run.game_mode || 'classic'} | Date: ${new Date(run.created_at).toLocaleString('fr-FR')}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

checkPierrotQuests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });

