/**
 * Vérifie si l'utilisateur a la quête daily_score_5000
 */
import { supabase } from './supabase-helper.mjs';

async function checkUser5000() {
  const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'; // Pierrot

  console.log('🔍 Vérification de la quête daily_score_5000 pour Pierrot\n');

  // 1. Vérifier dans quest_progress
  const { data: progress, error: progressError } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_key', 'daily_score_5000')
    .maybeSingle();

  if (progressError) {
    console.error('❌ Erreur:', progressError);
    return;
  }

  if (!progress) {
    console.log('❌ La quête daily_score_5000 N\'EXISTE PAS dans quest_progress pour cet utilisateur\n');

    // Créer la quête manquante
    console.log('💾 Création de la quête manquante...\n');

    const { error: insertError } = await supabase
      .from('quest_progress')
      .insert({
        user_id: userId,
        quest_key: 'daily_score_5000',
        current_value: 0,
        completed: false,
        assigned_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Erreur création:', insertError);
    } else {
      console.log('✅ Quête daily_score_5000 créée avec succès!');
      console.log('   Vous pouvez maintenant jouer une partie et elle devrait se mettre à jour.\n');
    }
  } else {
    console.log('✅ La quête existe:');
    console.log(`   Valeur actuelle: ${progress.current_value}`);
    console.log(`   Complétée: ${progress.completed ? 'Oui' : 'Non'}`);
    console.log(`   Dernière MAJ: ${new Date(progress.updated_at).toLocaleString('fr-FR')}\n`);
  }

  // 2. Lister TOUTES les quêtes de l'utilisateur
  const { data: allProgress } = await supabase
    .from('quest_progress')
    .select('quest_key, current_value, completed')
    .eq('user_id', userId)
    .order('quest_key');

  console.log(`📊 Total des quêtes pour Pierrot: ${allProgress?.length || 0}\n`);

  // 3. Comparer avec les quêtes disponibles
  const { data: allQuests } = await supabase
    .from('daily_quests')
    .select('quest_key, title');

  const userQuestKeys = new Set(allProgress?.map(p => p.quest_key) || []);
  const missingQuests = allQuests?.filter(q => !userQuestKeys.has(q.quest_key)) || [];

  if (missingQuests.length > 0) {
    console.log(`⚠️  ${missingQuests.length} quête(s) manquante(s):\n`);
    missingQuests.forEach(q => {
      console.log(`  • ${q.title} (${q.quest_key})`);
    });
    console.log('');
  } else {
    console.log('✅ Toutes les quêtes sont présentes\n');
  }
}

checkUser5000()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
